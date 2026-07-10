#!/usr/bin/env python3
"""
Supabase Migration Utility
==========================

This script reads the sanitized `data.json`, uploads the optimized `.webp`
images to your Supabase Storage bucket, and inserts the contacts into the
`profiles` table as "seed" profiles.

By design (as per your CLAUDE.md):
- They are inserted with `migrated = true` and `owner_id = NULL`.
- They are immediately `active = true`.
- They can be claimed later by real users via the `claim_migrated_profile` RPC.

Idempotent — safe to re-run:
- Matches existing rows by the unique `whatsapp` number (ONE bulk lookup).
- New number      -> INSERT.
- Unclaimed seed  -> UPDATE (refreshes photos/active/etc; keeps owner_id, created_at).
- Claimed seed (owner_id set) or a real non-seed profile -> SKIPPED, never touched.
- Images re-upload with x-upsert (overwrite), but claimed rows are skipped before
  the upload, so a real user's storage is never overwritten.

Performance:
- Image uploads run in a thread pool (`--workers`, storage has no bulk API).
- DB writes go out as chunked bulk upserts (`--batch-size`), not one-by-one.

Dependencies:
-------------
$ pip install supabase

Usage:
------
$ export SUPABASE_URL="https://your-project.supabase.co"
$ export SUPABASE_SERVICE_KEY="your-service-role-key"
$ python3 scripts/5_migrate_to_supabase.py --input scripts/data.json --images-dir scripts/temp/images
"""
import os
import json
import argparse
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from supabase import create_client, Client


def chunked(seq, size):
    """Yield successive `size`-length chunks from `seq`."""
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def main():
    parser = argparse.ArgumentParser(description="Migrate profiles and images to Supabase")
    parser.add_argument('--input', default='scripts/data.json', help="Path to data.json")
    parser.add_argument('--images-dir', default='scripts/temp/images', help="Path to the optimized images directory")
    # NOTE: must match the frontend bucket (`PHOTOS_BUCKET = 'profile-photos'` in
    # Register.tsx / Account.tsx). Wrong bucket = images upload nowhere the app looks.
    parser.add_argument('--bucket', default='profile-photos', help="Supabase storage bucket name for photos")
    parser.add_argument('--workers', type=int, default=8, help="Parallel image-upload workers")
    parser.add_argument('--batch-size', type=int, default=200, help="Rows per bulk DB upsert / lookup")
    parser.add_argument('--dry-run', action='store_true', help="Simulate migration without making any changes")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not url or not key:
        print("================================================================")
        print("❌ ERROR: Missing Supabase Credentials")
        print("You must provide both SUPABASE_URL and SUPABASE_SERVICE_KEY as")
        print("environment variables to run this migration.")
        print("")
        print("IMPORTANT: Use the SERVICE ROLE KEY (not the anon key) to bypass")
        print("RLS, as inserting 'migrated = true' requires admin privileges.")
        print("================================================================")
        return

    supabase: Client = create_client(url, key)

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: {input_path} does not exist.")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # We only migrate entries marked as valid AND safe (not NSFW).
    valid_data = [item for item in data if item.get('valid') and not item.get('nsfw', False)]
    nsfw_count = sum(1 for item in data if item.get('valid') and item.get('nsfw', False))

    print(f"📂 Loaded {len(data)} rows from {input_path.name}")
    print(f"✅ {len(valid_data)} valid & safe to migrate.")
    if nsfw_count > 0:
        print(f"⚠️  Filtered out {nsfw_count} profiles flagged as NSFW.")
    if args.dry_run:
        print("🏁 DRY RUN — no changes will be made.")
    print(f"⚙️  bucket='{args.bucket}'  workers={args.workers}  batch={args.batch_size}\n")

    error_count = 0

    # ------------------------------------------------------------------
    # Phase 1 — build work items (validate phone + image on disk).
    # ------------------------------------------------------------------
    print("── Phase 1: validating inputs ─────────────────")
    items = {}  # whatsapp -> item dict (dedup by number; last wins)
    for item in valid_data:
        phone = item.get('key', '')
        whatsapp = re.sub(r'[^\d]', '', phone)  # E.164 WITHOUT the '+'
        image_ref = item.get('imageRef')

        if not whatsapp:
            print(f"⚠️  Skip: '{phone}' has no usable digits.")
            error_count += 1
            continue
        if not image_ref:
            print(f"⚠️  Skip {whatsapp}: no image reference.")
            error_count += 1
            continue
        img_path = Path(args.images_dir) / image_ref
        if not img_path.exists():
            print(f"⚠️  Skip {whatsapp}: image '{image_ref}' not found in {args.images_dir}.")
            error_count += 1
            continue

        if whatsapp in items:
            print(f"⚠️  Duplicate number {whatsapp} in data.json — keeping the later row.")
        items[whatsapp] = {
            "whatsapp": whatsapp,
            "image_ref": image_ref,
            "img_path": img_path,
            "description": (item.get('description') or '')[:300],  # schema cap
            "region": item.get('country'),
            "gender": item.get('gender', 'other'),  # deepface; schema: male/female/other
        }
    print(f"   → {len(items)} unique, image-backed candidates.\n")

    if not items:
        print("Nothing to do.")
        return

    # ------------------------------------------------------------------
    # Phase 2 — ONE bulk lookup of existing rows (chunked IN query).
    # ------------------------------------------------------------------
    print("── Phase 2: looking up existing rows ──────────")
    numbers = list(items.keys())
    existing = {}  # whatsapp -> {id, owner_id, migrated}
    try:
        for batch in chunked(numbers, args.batch_size):
            res = (
                supabase.table('profiles')
                .select('id, owner_id, migrated, whatsapp')
                .in_('whatsapp', batch)
                .execute()
            )
            for r in (res.data or []):
                existing[r['whatsapp']] = r
    except Exception as e:
        print(f"❌ Bulk lookup failed: {e}")
        return
    print(f"   → {len(existing)} of {len(numbers)} numbers already in the DB.\n")

    # ------------------------------------------------------------------
    # Phase 3 — classify: skip claimed/real, queue new + unclaimed seeds.
    # ------------------------------------------------------------------
    skip_count = 0
    to_insert, to_update = [], []
    for wa, it in items.items():
        row = existing.get(wa)
        # Claimed seed (owner_id set) or a real self-registered profile
        # (migrated = false) belongs to a real person — NEVER touch it.
        if row and (row.get('owner_id') is not None or not row.get('migrated', True)):
            skip_count += 1
            continue
        (to_update if row else to_insert).append(it)

    print("── Phase 3: plan ─────────────────────────────")
    print(f"   ➕ insert (new)           : {len(to_insert)}")
    print(f"   🔁 update (unclaimed seed): {len(to_update)}")
    print(f"   ⏭️  skip (claimed/real)   : {skip_count}\n")

    work = to_insert + to_update
    if not work:
        print("Nothing new to write.")
        _summary(len(to_insert), len(to_update), skip_count, error_count)
        return

    # ------------------------------------------------------------------
    # Phase 4 — upload images (threaded). Failures drop the row from the DB write.
    # ------------------------------------------------------------------
    print(f"── Phase 4: uploading {len(work)} images ({args.workers} workers) ──")
    total = len(work)

    def upload_one(it):
        if args.dry_run:
            return it, True, None
        try:
            with open(it['img_path'], 'rb') as fh:
                image_bytes = fh.read()
            # x-upsert overwrites if the object already exists (re-runs).
            supabase.storage.from_(args.bucket).upload(
                path=it['image_ref'],
                file=image_bytes,
                file_options={"content-type": "image/webp", "x-upsert": "true"},
            )
            return it, True, None
        except Exception as e:
            # A genuine "already exists" (older clients w/o x-upsert) is fine;
            # anything else is a real failure we must NOT hide.
            msg = str(e).lower()
            if "exists" in msg or "duplicate" in msg or "409" in msg:
                return it, True, None
            return it, False, str(e)

    ok_items = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        futures = {pool.submit(upload_one, it): it for it in work}
        done = 0
        for fut in as_completed(futures):
            it, ok, err = fut.result()
            done += 1
            if ok:
                ok_items.append(it)
                verb = "would upload" if args.dry_run else "uploaded"
                print(f"   ⬆️  [{done}/{total}] {verb} {it['image_ref']} ({it['whatsapp']})")
            else:
                error_count += 1
                print(f"   ❌ [{done}/{total}] upload FAILED {it['image_ref']} ({it['whatsapp']}): {err}")
    print(f"   → {len(ok_items)}/{total} images ready.\n")

    # ------------------------------------------------------------------
    # Phase 5 — build rows + chunked bulk upsert (on_conflict=whatsapp).
    # ------------------------------------------------------------------
    print("── Phase 5: writing profiles (bulk upsert) ────")
    rows = []
    for it in ok_items:
        wa = it['whatsapp']
        image_url = supabase.storage.from_(args.bucket).get_public_url(it['image_ref'])
        name = f"Usuario {wa[-4:]}" if len(wa) >= 4 else "Unknow"
        row = {
            "name": name,
            "description": it['description'],
            "whatsapp": wa,
            "photos": [image_url],  # frontend uses photos[i] straight as <img src>
            "active": False,
            "migrated": True,
            "gender": it['gender'],
        }
        if it['region'] and it['region'] != "Unknown":
            row["region"] = it['region'][:80]  # schema cap
        rows.append(row)

    wrote = 0
    if args.dry_run:
        n_batches = max(1, -(-len(rows) // args.batch_size))
        print(f"   🔍 [DRY RUN] Would upsert {len(rows)} rows in {n_batches} batch(es).")
        wrote = len(rows)
    else:
        for i, batch in enumerate(chunked(rows, args.batch_size), start=1):
            try:
                # on_conflict='whatsapp' -> INSERT new, UPDATE existing seeds.
                # Claimed/real rows were filtered out in Phase 3, so no owner
                # data is at risk here. owner_id / created_at are not in the
                # payload, so a conflicting update leaves them intact.
                supabase.table('profiles').upsert(batch, on_conflict='whatsapp').execute()
                wrote += len(batch)
                print(f"   💾 batch {i}: wrote {len(batch)} rows.")
            except Exception as e:
                error_count += len(batch)
                print(f"   ❌ batch {i} FAILED ({len(batch)} rows): {e}")
    print()

    _summary(len(to_insert), len(to_update), skip_count, error_count, wrote=wrote)


def _summary(n_insert, n_update, n_skip, n_err, wrote=None):
    print("=============================")
    print("   MIGRATION RESULTS         ")
    print("=============================")
    print(f"➕ Planned inserts (new)   : {n_insert}")
    print(f"🔁 Planned updates (seed)  : {n_update}")
    if wrote is not None:
        print(f"💾 Rows written (upsert)   : {wrote}")
    print(f"⏭️  Skipped (claimed/real) : {n_skip}")
    print(f"❌ Errors                 : {n_err}")
    print("=============================")


if __name__ == '__main__':
    main()
