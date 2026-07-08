#!/usr/bin/env python3
"""
Gender Detection Utility
========================

This script uses the `deepface` library to analyze the primary face in each 
image and attempts to classify the person's gender (male/female).
It adds a `"gender"` field to each profile in `data.json`.

If a face cannot be detected with confidence, or if the library throws an 
error, it defaults to `"other"`.

Dependencies:
-------------
$ pip install deepface opencv-python pillow

Usage:
------
$ python3 scripts/gender_detector.py --input scripts/data.json --images-dir scripts/temp/images
"""
import json
import argparse
from pathlib import Path

try:
    from deepface import DeepFace
except ImportError:
    print("Error: Required libraries are missing.")
    print("Please install them by running:")
    print("pip install deepface opencv-python pillow tf-keras")
    exit(1)

def main():
    parser = argparse.ArgumentParser(description="Detect gender from images using DeepFace")
    parser.add_argument('--input', default='scripts/data.json', help="Path to data.json")
    parser.add_argument('--images-dir', default='scripts/temp/images', help="Path to images directory")
    args = parser.parse_args()

    input_path = Path(args.input)
    images_dir = Path(args.images_dir)

    if not input_path.exists():
        print(f"Error: {input_path} does not exist.")
        return

    print(f"Reading {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # We only care about checking valid profiles with existing images
    valid_profiles = [p for p in data if p.get('valid')]
    
    print(f"Preparing to analyze {len(valid_profiles)} profiles for gender...")
    print("🧠 Booting up DeepFace... (First run will download the facial models)")
    
    male_count = 0
    female_count = 0
    other_count = 0

    for item in valid_profiles:
        img_ref = item.get('imageRef')
        if not img_ref:
            continue
            
        img_path = images_dir / img_ref
        if not img_path.exists():
            continue

        try:
            # We set enforce_detection=False so it doesn't crash if no face is perfectly aligned
            result = DeepFace.analyze(
                img_path=str(img_path), 
                actions=['gender'], 
                enforce_detection=False,
                silent=True # Prevent spamming the console
            )
            
            # DeepFace >= 0.0.75 returns a list of dicts if multiple faces are found
            if isinstance(result, list):
                face = result[0]
            else:
                face = result
                
            dominant_gender = face.get('dominant_gender', '')
            
            # DeepFace returns 'Man' or 'Woman'
            if dominant_gender == 'Man':
                item['gender'] = 'male'
                male_count += 1
            elif dominant_gender == 'Woman':
                item['gender'] = 'female'
                female_count += 1
            else:
                item['gender'] = 'other'
                other_count += 1
                
        except Exception as e:
            # Fallback if an error occurs (e.g. image completely unreadable)
            item['gender'] = 'other'
            other_count += 1

    # Save results
    with open(input_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("\n=============================")
    print("   GENDER ANALYSIS COMPLETE  ")
    print("=============================")
    print(f"👨 Male   : {male_count}")
    print(f"👩 Female : {female_count}")
    print(f"👤 Other  : {other_count} (No clear face detected)")
    print("=============================")
    
if __name__ == '__main__':
    main()
