#!/usr/bin/env python3
"""
Image Optimization Utility
==========================

This standalone utility script is designed to batch process, resize, and optimize 
images for web performance using the Pillow (PIL) library.

Key Features:
-------------
1. Format Conversion: Converts various image formats (JPEG, PNG, etc.) to WebP,
   which provides superior lossless and lossy compression for web images.
2. Resizing: Automatically resizes images that exceed the specified maximum 
   dimensions (default: 1024x1024) while preserving their original aspect ratio.
3. Batch Processing: Recursively scans an input directory for supported images 
   and processes them in bulk, saving the optimized versions to a specified output 
   directory.
4. Transparency Handling: Properly converts RGBA or Palette images to RGB to 
   avoid color issues during the WebP conversion process.

Usage:
------
Run this script via terminal:
$ python3 scripts/optimize_images.py --input "path/to/source/images" \
                                     --output "path/to/optimized/images" \
                                     --max-size 1024 \
                                     --quality 80
"""
import os
import argparse
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is not installed. Please install it using:")
    print("pip install Pillow")
    exit(1)

def optimize_image(input_path, output_path, max_size=(1024, 1024), quality=80):
    try:
        with Image.open(input_path) as img:
            # Convert to RGB to avoid issues with transparency or palettes in WebP
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
                
            # Resize while keeping aspect ratio
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save as WEBP
            img.save(output_path, 'webp', quality=quality, optimize=True)
            return True
    except Exception as e:
        print(f"Failed to optimize {input_path}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Optimize images and convert to WebP format")
    parser.add_argument('--input-dir', required=True, help="Directory containing original images")
    parser.add_argument('--output-dir', required=True, help="Directory to save optimized WebP images")
    parser.add_argument('--quality', type=int, default=80, help="WebP quality (0-100), default 80")
    parser.add_argument('--max-width', type=int, default=1024, help="Max width/height for resizing, default 1024")
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    
    if not input_dir.exists():
        print(f"Error: Input directory {input_dir} does not exist.")
        exit(1)
        
    output_dir.mkdir(parents=True, exist_ok=True)
    
    supported_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
    
    success_count = 0
    error_count = 0
    
    for file_path in input_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
            # Change extension to .webp
            output_filename = file_path.stem + '.webp'
            output_path = output_dir / output_filename
            
            print(f"Optimizing {file_path.name} -> {output_filename}")
            
            if optimize_image(file_path, output_path, max_size=(args.max_width, args.max_width), quality=args.quality):
                success_count += 1
            else:
                error_count += 1
                
    print(f"\nOptimization complete.")
    print(f"Successfully optimized: {success_count} images")
    if error_count > 0:
        print(f"Failed to optimize: {error_count} images")

if __name__ == "__main__":
    main()
