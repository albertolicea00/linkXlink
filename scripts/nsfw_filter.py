#!/usr/bin/env python3
"""
NSFW Image Filter Utility (HuggingFace Edition)
===============================================

This script uses the modern `Falconsai/nsfw_image_detection` Vision Transformer 
model to analyze all images referenced in `data.json`. It adds an `"nsfw_score"` 
and a boolean `"nsfw"` flag to each profile.

This ensures that any pornographic or suggestive images extracted from 
WhatsApp are automatically identified and blocked before migration.

Dependencies:
-------------
$ pip install transformers torch pillow

Usage:
------
$ python3 scripts/nsfw_filter.py --input scripts/data.json --images-dir scripts/temp/images
"""
import json
import argparse
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
    parser = argparse.ArgumentParser(description="Scan images for NSFW content using Transformers")
    parser.add_argument('--input', default='scripts/data.json', help="Path to data.json")
    parser.add_argument('--images-dir', default='scripts/temp/images', help="Path to images directory")
    parser.add_argument('--threshold', type=float, default=0.7, help="Probability threshold to classify as NSFW (default: 0.7)")
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
        print("No physical images found to scan.")
        return

    print(f"Preparing to scan {len(profile_refs)} valid profiles for NSFW content...")
    print("🧠 Booting up Vision Transformer model (Falconsai/nsfw_image_detection)...")
    print("⏳ This might take a few minutes. Downloading model if first run...")
    
    try:
        # Load the pipeline
        classifier = pipeline("image-classification", model="Falconsai/nsfw_image_detection")
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    try:
        from tqdm import tqdm
    except ImportError:
        print("Please install tqdm: pip install tqdm")
        exit(1)

    nsfw_count = 0
    safe_count = 0

    for item, img_path in tqdm(profile_refs, desc="🔞 Scanning for NSFW", unit="img"):
        try:
            # Predict
            results = classifier(str(img_path))
            
            # Extract the NSFW score from the results array
            nsfw_score = 0.0
            for res in results:
                if res['label'].lower() == 'nsfw':
                    nsfw_score = float(res['score'])
                    break
                    
            is_nsfw = bool(nsfw_score >= args.threshold)
            
            item['nsfw_score'] = round(nsfw_score, 4)
            item['nsfw'] = is_nsfw
            
            if is_nsfw:
                nsfw_count += 1
                tqdm.write(f"🔴 NSFW Detected: {item.get('key')} (Score: {nsfw_score:.2f})")
            else:
                safe_count += 1
                
        except Exception as e:
            tqdm.write(f"⚠️ Error scanning image {img_path.name}: {e}")

    # Save results
    with open(input_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("\n=============================")
    print("   NSFW SCAN COMPLETE        ")
    print("=============================")
    print(f"✅ Safe Images : {safe_count}")
    print(f"🔞 NSFW Images : {nsfw_count} (Blocked at >= {args.threshold} score)")
    print("=============================")
    
if __name__ == '__main__':
    main()
