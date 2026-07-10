#!/usr/bin/env python3
"""
Gender Detection Utility (HuggingFace Edition)
==============================================

This script uses a modern Vision Transformer model to analyze the primary 
face in each image and attempts to classify the person's gender (male/female).
It adds a `"gender"` field to each profile in `data.json`.

If a face cannot be detected with confidence, or if the library throws an 
error, it defaults to `"other"`.

Dependencies:
-------------
$ pip install transformers torch pillow

Usage:
------
$ python3 scripts/gender_detector.py --input scripts/data.json --images-dir scripts/temp/images
"""
import json
import argparse
import os
from pathlib import Path

try:
    from transformers import pipeline
    from PIL import Image
    import torch
except ImportError:
    print("Error: Required libraries are missing.")
    print("Please install them by running:")
    print("pip install transformers torch pillow")
    exit(1)

def main():
    parser = argparse.ArgumentParser(description="Detect gender from images using Transformers")
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
    
    profile_refs = []
    
    for item in valid_profiles:
        img_ref = item.get('imageRef')
        if not img_ref:
            continue
        
        img_path = images_dir / img_ref
        if img_path.exists():
            profile_refs.append((item, img_path))

    if not profile_refs:
        print("No physical images found to analyze.")
        return

    try:
        from huggingface_hub import snapshot_download
        
        # Explicitly download the model to a local directory
        model_dir = Path("scripts/models/gender-classification-2")
        print(f"Downloading/Verifying model at {model_dir}...")
        
        kwargs = {
            "repo_id": "rizvandwiki/gender-classification-2",
            "local_dir": str(model_dir)
        }
        
        # Make token completely optional
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            kwargs["token"] = hf_token
            
        snapshot_download(**kwargs)
        
        # Load the pipeline from the local directory
        classifier = pipeline("image-classification", model=str(model_dir))
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    try:
        from tqdm import tqdm
    except ImportError:
        print("Please install tqdm: pip install tqdm")
        exit(1)

    male_count = 0
    female_count = 0
    other_count = 0

    for item, img_path in tqdm(profile_refs, desc="👥 Scanning Gender", unit="img"):
        try:
            # Predict
            results = classifier(str(img_path))
            
            # Extract top label
            dominant_gender = results[0]['label'].lower()
            
            if dominant_gender == 'male':
                item['gender'] = 'male'
                male_count += 1
            elif dominant_gender == 'female':
                item['gender'] = 'female'
                female_count += 1
            else:
                item['gender'] = 'other'
                other_count += 1
                
        except Exception as e:
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
    print(f"👤 Other  : {other_count} (Fallback)")
    print("=============================")
    
if __name__ == '__main__':
    main()
