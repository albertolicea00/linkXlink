#!/usr/bin/env python3
"""
Country Detection Utility
=========================

This script reads the master `data.json` and analyzes the phone numbers to 
determine the country of origin based on their international dialing code.
It adds a new `"country"` field to each contact.

Usage:
------
$ python3 scripts/add_country.py --input scripts/data.json
"""
import json
import argparse
from pathlib import Path

# Dictionary mapping international dialing codes to country names
# We will match the longest codes first to avoid prefix collisions.
COUNTRY_CODES = {
    "+53": "Cuba",
    "+52": "Mexico",
    "+58": "Venezuela",
    "+54": "Argentina",
    "+57": "Colombia",
    "+56": "Chile",
    "+51": "Peru",
    "+55": "Brazil",
    "+34": "Spain",
    "+593": "Ecuador",
    "+507": "Panama",
    "+506": "Costa Rica",
    "+504": "Honduras",
    "+503": "El Salvador",
    "+502": "Guatemala",
    "+505": "Nicaragua",
    "+598": "Uruguay",
    "+595": "Paraguay",
    "+591": "Bolivia",
    "+1": "USA",
    "+44": "United Kingdom",
    "+39": "Italy",
    "+33": "France",
    "+49": "Germany",
    "+351": "Portugal",
    "+7": "Russia",
    "+86": "China",
    "+91": "India",
    "+81": "Japan",
    "+61": "Australia"
}

# Sort keys by length descending to match +593 before +59, etc.
SORTED_CODES = sorted(COUNTRY_CODES.keys(), key=len, reverse=True)

def detect_country(phone):
    if not phone:
        return "Unknown"
        
    for code in SORTED_CODES:
        if phone.startswith(code):
            return COUNTRY_CODES[code]
            
    return "Unknown"

def main():
    parser = argparse.ArgumentParser(description="Add country field to data.json based on phone code")
    parser.add_argument('--input', default='scripts/data.json', help="Path to data.json")
    args = parser.parse_args()

    input_path = Path(args.input)

    if not input_path.exists():
        print(f"Error: {input_path} does not exist.")
        return

    print(f"Reading {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated_count = 0
    country_stats = {}

    for item in data:
        phone = item.get('key', '')
        country = detect_country(phone)
        
        item['country'] = country
        updated_count += 1
        
        # Track stats
        country_stats[country] = country_stats.get(country, 0) + 1

    # Save JSON with country fields
    with open(input_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nCountry Detection Complete!")
    print(f"- Total contacts processed: {updated_count}")
    print("\n--- Demographics ---")
    
    # Print stats sorted by count descending
    sorted_stats = sorted(country_stats.items(), key=lambda x: x[1], reverse=True)
    for c, count in sorted_stats:
        print(f"{c}: {count}")

if __name__ == '__main__':
    main()
