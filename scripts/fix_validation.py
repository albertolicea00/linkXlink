#!/usr/bin/env python3
"""
Fix & Validation Utility
========================

This script checks all phone numbers in the master `data.json` file.
1. Cleans any malformed phone numbers (e.g. trailing '+').
2. Adds a boolean `"valid": true` if the phone number has 8 or more digits.
3. Adds a boolean `"valid": false` if the phone number is incomplete (less than 8 digits).
4. Renames the associated image files physically if a phone number was corrected.

Usage:
------
$ pip install phonenumbers
$ python3 scripts/fix_validation.py --input scripts/data.json --images-dir scripts/temp/images
"""
import json
import os
import re
import argparse
import uuid
from pathlib import Path

try:
    import phonenumbers
except ImportError:
    print("Error: The 'phonenumbers' library is required.")
    print("Please install it by running: pip install phonenumbers")
    exit(1)

def get_clean_phone(phone_str):
    if not phone_str:
        return "", False
        
    # Extract just the digits to ensure a clean base
    digits = re.sub(r'[^\d]', '', phone_str)
    if not digits:
        return "", False
        
    # CUBAN FALLBACK RULE:
    # Cuban mobile numbers are exactly 8 digits long and start with '5' (e.g. 56551628).
    # If the user saved it without a country code (or it was wrongly extracted as +56...), 
    # we prepend the +53 country code automatically so it validates correctly.
    if len(digits) == 8 and digits.startswith('5'):
        digits = '53' + digits
        
    # All our numbers should be international (starting with +)
    clean_str = '+' + digits
    
    try:
        parsed = phonenumbers.parse(clean_str, None)
        is_valid = phonenumbers.is_valid_number(parsed)
        
        if is_valid:
            formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            return formatted, True
        else:
            return clean_str, False
    except phonenumbers.NumberParseException:
        return clean_str, False

def main():
    parser = argparse.ArgumentParser(description="Fix phones and add valid flag to data.json")
    parser.add_argument('--input', default='scripts/data.json', help="Path to data.json")
    parser.add_argument('--images-dir', default='scripts/temp/images', help="Path to the directory containing the images")
    args = parser.parse_args()

    input_path = Path(args.input)
    images_dir = Path(args.images_dir)

    if not input_path.exists():
        print(f"Error: {input_path} does not exist.")
        return

    print(f"Reading {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    fixed_count = 0
    valid_count = 0
    invalid_count = 0
    
    # Dictionary to ensure uniqueness after fixing
    unique_data = {}

    for item in data:
        old_phone = item.get('key', '')
        clean_phone, is_valid_phone = get_clean_phone(old_phone)

        # Clean up description and links (strip whitespace, normalize spaces)
        desc = item.get('description', '')
        if isinstance(desc, str):
            desc = re.sub(r'\s+', ' ', desc).strip()
            item['description'] = desc
            
        links = item.get('links', [])
        if isinstance(links, list):
            item['links'] = [re.sub(r'\s+', '', l).strip() for l in links if isinstance(l, str)]

        # Spam/Adult Content Text Filter
        is_safe_text = True
        if isinstance(desc, str) and re.search(r'\bcontenido\b', desc, re.IGNORECASE):
            is_safe_text = False

        # Image existence check — if the file isn't on disk it can't be migrated
        has_image = False
        img_ref = item.get('imageRef', '')
        if img_ref:
            has_image = (images_dir / img_ref).exists()

        # Final validity requires a valid phone, safe text, and a physical image
        is_valid = is_valid_phone and is_safe_text and has_image

        # Update the flag
        item['valid'] = is_valid
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        # We keep the old phone if there are no digits at all, otherwise use the clean one
        new_phone = clean_phone if clean_phone else old_phone

        # Always rename image to a random UUID to ensure clean, standard naming
        # rather than using the messy ones from WhatsApp (-PHOTO-2026-...)
        old_ref = item.get('imageRef', '')
        if old_ref:
            old_path = Path(old_ref)
            # Only rename if it's not already a UUID (36 chars)
            if len(old_path.stem) != 36:
                old_img_path = images_dir / old_ref
                if old_img_path.exists():
                    new_ref = f"{uuid.uuid4()}{old_path.suffix}"
                    new_img_path = images_dir / new_ref
                    os.rename(old_img_path, new_img_path)
                    item['imageRef'] = new_ref

        # Handle malformed but fixed numbers
        if old_phone != new_phone:
            item['key'] = new_phone
            item['phone'] = new_phone
            fixed_count += 1

        # Resolve any duplicates after renaming
        if new_phone in unique_data:
            existing_date = unique_data[new_phone].get('date', '')
            if item.get('date', '') >= existing_date:
                unique_data[new_phone] = item
        else:
            unique_data[new_phone] = item

    # Save fixed JSON
    with open(input_path, 'w', encoding='utf-8') as f:
        json.dump(list(unique_data.values()), f, indent=2, ensure_ascii=False)

    print(f"\nFix and Validation Complete!")
    print(f"- Malformed phones fixed: {fixed_count}")
    print(f"- Added valid flag: {valid_count} Valid / {invalid_count} Invalid")
    print(f"- Total unique entries saved: {len(unique_data)}")

if __name__ == '__main__':
    main()
