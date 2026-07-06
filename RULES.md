# Community & Moderation Rules

Source of truth for what Link x Link allows, how profiles get approved or
denied, and how ownership disputes are handled. The deny-reason pick-list and
the quorum thresholds referenced here are the ones enforced in code
(`src/config/app-config.json` + `app.settings` in Postgres).

## Content rules (a profile must)

- Be a real person, 18+ (enforced: birthdate 18+ check at registration).
- Use photos of that same person — no stock, celebrity, or someone else's photos.
- Carry a WhatsApp number the person actually controls.
- Keep the bio free of offensive, hateful, or illegal content.
- Be unique — one profile per person, one per WhatsApp number, one per account.

## Approval & denial (moderation)

Moderation happens in the panel deck. A swipe (drag or arrow keys) only ever
**skips** to the next card — it never approves or denies. Approve and Deny are
explicit buttons.

Both actions are **quorum-gated** server-side (`moderate_profile` RPC):

| Action  | Applied when                                              | Config key |
| ------- | --------------------------------------------------------- | ---------- |
| Approve | one admin votes, OR `moderation_approve_quorum` moderators | `approve_quorum` |
| Deny    | one admin votes, OR `moderation_deny_quorum` moderators    | `deny_quorum`    |

Defaults: approve = 1 (a single moderator still approves instantly), deny = 3.
An admin's vote bypasses the quorum for either action. Votes are one-per-moderator
(idempotent); the deck shows the running tally until quorum is reached.

**Deny requires a reason.** The moderator picks from a fixed list (shown in the
UI, values stored as plain text in `moderation_actions.reason`). The list lives
in `moderation_deny_reasons`:

- `spam` — spam or advertising
- `fake_photos` — fake or someone else's photos
- `underage` — looks underage
- `offensive` — offensive content
- `duplicate` — duplicate profile
- `wrong_number` — wrong WhatsApp number
- `other` — free-text reason

Denied profiles stay inactive (`denied_at` set) and drop out of the pending queue.

## Reports & auto-disable

Anyone can report an active profile. At `report_threshold` reports a DB trigger
auto-disables the profile — no moderator action needed.

## Seed profiles & claiming

The launch feed is seeded with real people (`migrated = true`, ownerless). When
the real owner registers with the **same WhatsApp number**, the profile is
claimed (assigned to them) instead of erroring on the duplicate number.

## Ownership claims ("it's mine")

If the number is already owned by a non-seed profile, the new registrant can
file an ownership claim ("Es mío"). This only records the claim for a moderator
to review (`ownership_claims`) — there is **no** automatic reassignment.
