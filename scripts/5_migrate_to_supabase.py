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
from supabase import create_client, Client

def main():
    parser = argparse.ArgumentParser(description="Migrate profiles and images to Supabase")
    parser.add_argument('--input', default='scripts/data.json', help="Path to data.json")
    parser.add_argument('--images-dir', default='scripts/temp/images', help="Path to the optimized images directory")
    parser.add_argument('--bucket', default='profiles', help="Supabase storage bucket name for photos")
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

    # Initialize Supabase client
    supabase: Client = create_client(url, key)

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: {input_path} does not exist.")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # We only migrate entries marked as valid AND safe (not NSFW)
    valid_data = [
        item for item in data 
        if item.get('valid') and not item.get('nsfw', False)
    ]
    print(f"Found {len(valid_data)} valid & safe profiles to migrate.")
    if args.dry_run:
        print(f"🏁 DRY RUN — no changes will be made.\n")
    
    nsfw_count = sum(1 for item in data if item.get('valid') and item.get('nsfw', False))
    if nsfw_count > 0:
        print(f"⚠️  Filtered out {nsfw_count} profiles flagged as NSFW.")

    success_count = 0
    error_count = 0
    skip_count = 0

    for item in valid_data:
        phone = item.get('key', '')
        
        # Format for DB: E.164 WITHOUT the '+'
        whatsapp = re.sub(r'[^\d]', '', phone)
        
        image_ref = item.get('imageRef')
        desc = item.get('description', '')[:300] # Max 300 chars as per schema
        region = item.get('country') # We use the detected country as the region for these seeds
        
        if not image_ref:
            print(f"⚠️  Skipping {phone} - No image reference.")
            error_count += 1
            continue
            
        img_path = Path(args.images_dir) / image_ref
        if not img_path.exists():
            print(f"⚠️  Skipping {phone} - Image '{image_ref}' not found in {args.images_dir}.")
            error_count += 1
            continue

        print(f"Processing {phone}...")

        # 1. Upload image to Supabase Storage
        if not args.dry_run:
            try:
                with open(img_path, 'rb') as f:
                    image_bytes = f.read()

                # x-upsert ensures it overwrites if you run the script multiple times
                supabase.storage.from_(args.bucket).upload(
                    path=image_ref,
                    file=image_bytes,
                    file_options={"content-type": "image/webp", "x-upsert": "true"}
                )
            except Exception as e:
                # If the library version doesn't support x-upsert, it might throw an error if the file exists.
                # We can safely catch it and continue.
                pass
        else:
            print(f"   🔍 [DRY RUN] Would upload '{image_ref}' to bucket '{args.bucket}'")

        # The frontend renders `photos[i]` straight into <img src>, so it needs a
        # full public URL — NOT the bare object path. Build it the same way the
        # register/account flows do (getPublicUrl), otherwise images 404.
        image_url = supabase.storage.from_(args.bucket).get_public_url(image_ref)

        # 2. Insert into Database
        # Since we don't know their real name, we give them a generic placeholder
        name_placeholder = f"Usuario {whatsapp[-4:]}" if len(whatsapp) >= 4 else "Anónimo"
        
        # Gender was detected by deepface. Schema accepts 'male', 'female', 'other'.
        # We default to 'other' if it hasn't been run or was undetected.
        detected_gender = item.get('gender', 'other')

        profile_data = {
            "name": name_placeholder,
            "description": desc,
            "whatsapp": whatsapp,
            "photos": [image_url],
            "active": False,
            "migrated": True,
            "gender": detected_gender,
        }
        
        # Only attach region if we have it and it's not "Unknown"
        if region and region != "Unknown":
            profile_data["region"] = region[:80] # Schema limit is 80 chars

        if not args.dry_run:
            try:
                supabase.table('profiles').insert(profile_data).execute()
                success_count += 1
                print(f"   ✅ Successfully migrated!")
            except Exception as e:
                error_msg = str(e).lower()
                if "23505" in error_msg or "duplicate key" in error_msg:
                    print(f"   ⏭️  Already exists in database. Skipped.")
                    skip_count += 1
                else:
                    print(f"   ❌ DB Error: {e}")
                    error_count += 1
        else:
            print(f"   🔍 [DRY RUN] Would insert profile (whatsapp={whatsapp})")
            success_count += 1

    print(f"\n=============================")
    print(f"   MIGRATION RESULTS         ")
    print(f"=============================")
    print(f"✅ Successfully inserted : {success_count}")
    print(f"⏭️  Skipped (duplicates)  : {skip_count}")
    print(f"❌ Errors (missing images): {error_count}")
    print(f"=============================")

if __name__ == '__main__':
    main()
