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
$ python3 scripts/fix_validation.py --input scripts/data.json --images-dir scripts/temp/images
"""
import json
import os
import re
import argparse
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

        # Final validity requires both a valid phone and safe text
        is_valid = is_valid_phone and is_safe_text

        # Update the flag
        item['valid'] = is_valid
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        # We keep the old phone if there are no digits at all, otherwise use the clean one
        new_phone = clean_phone if clean_phone else old_phone

        # Handle malformed but fixed numbers
        if old_phone != new_phone:
            item['key'] = new_phone
            item['phone'] = new_phone
            
            old_ref = item.get('imageRef', '')
            # Replace exactly the old phone prefix in the image filename
            new_ref = old_ref.replace(old_phone, new_phone)
            item['imageRef'] = new_ref
            
            # Physically rename the image file if it exists
            old_img_path = images_dir / old_ref
            new_img_path = images_dir / new_ref
            
            if old_img_path.exists() and old_ref != new_ref:
                os.rename(old_img_path, new_img_path)
                
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
