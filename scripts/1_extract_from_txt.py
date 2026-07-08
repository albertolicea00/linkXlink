#!/usr/bin/env python3
"""
WhatsApp Chat Export Parser
===========================

This script is designed to parse raw WhatsApp text export files (e.g., `_chat.txt`)
and extract meaningful metadata to populate a structured JSON dataset (`data.json`).

Key Features:
-------------
1. Data Extraction: Parses messages to extract timestamps, sender names/phones, 
   and the message text.
2. Link & Phone Filtering: Automatically identifies and extracts URLs into a separate 
   'links' array. It also removes extracted URLs and phone numbers from the main 
   message description for a cleaner text field.
3. Media Handling: Identifies image attachments (e.g., .jpg, .png, .webp).
   Specifically skips non-image formats like GIFs or MP4 videos.
4. Deduplication: Ensures that each phone number has only one entry in the dataset. 
   If a user sends multiple messages, the script keeps the most recent message based 
   on the timestamp.
5. Image Management: Renames and copies the referenced image attachments into a 
   designated temporary output directory.

Usage:
------
Run this script via terminal:
$ python3 scripts/parse_whatsapp.py --input "path/to/_chat.txt" \
                                    --output "path/to/data.json" \
                                    --copy-images-to "path/to/images" \
                                    --source-name "WhatsApp Group Name"
"""
import os
import re
import json
import shutil
import argparse
from datetime import datetime

def clean_text(text):
    return text.replace('\u200e', '').replace('\u200f', '').strip()

def parse_date(date_str):
    date_str = date_str.strip()
    date_str = date_str.replace('\u202f', ' ').replace('\u200e', '').replace('\u200f', '')
    formats = [
        "%m/%d/%y, %I:%M:%S %p",
        "%m/%d/%Y, %I:%M:%S %p",
        "%d/%m/%y, %I:%M:%S %p",
        "%d/%m/%Y, %I:%M:%S %p",
        "%m/%d/%y, %H:%M:%S",
        "%m/%d/%Y, %H:%M:%S",
        "%d/%m/%y, %H:%M:%S",
        "%d/%m/%Y, %H:%M:%S"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Could not parse date: {date_str}")

def parse_chat(file_path, source_name=None, images_out_dir=None):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    chat_dir = os.path.dirname(os.path.abspath(file_path))

    if not source_name:
        source_name = os.path.basename(chat_dir)
        if not source_name or source_name == "backup":
            parts = os.path.abspath(file_path).split(os.sep)
            if len(parts) > 1:
                source_name = parts[-2]
                
    if not source_name:
        raise ValueError("Could not determine source group name. Please provide it via --source.")

    if images_out_dir and not os.path.exists(images_out_dir):
        os.makedirs(images_out_dir)

    msg_start_pattern = re.compile(r'^[\u200e\u200f]*\[(.*?)\] (.*?): (.*)', re.DOTALL)
    
    messages = []
    current_msg = None

    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            match = msg_start_pattern.match(line)
            if match:
                if current_msg:
                    messages.append(current_msg)
                
                date_str = match.group(1)
                author = clean_text(match.group(2))
                text = match.group(3)
                
                try:
                    dt = parse_date(date_str)
                except ValueError as e:
                    print(f"Warning: {e}")
                    dt = datetime.now() # Fallback
                    
                current_msg = {
                    'date': dt,
                    'author': author,
                    'text': text
                }
            else:
                if current_msg:
                    current_msg['text'] += '\n' + line

        if current_msg:
            messages.append(current_msg)

    data = {}
    attachment_pattern = re.compile(r'<attached:\s*(.*?)>', re.IGNORECASE)

    def extract_phone(text, author):
        # Look for links
        match = re.search(r'(?:wa\.me/|api\.whatsapp\.com/send\?phone=)\s*/?\s*([+\d\s\-]+)', text, re.IGNORECASE)
        if match:
            num = re.sub(r'[^\d]', '', match.group(1))
            if num:
                return '+' + num
        
        # Look for explicit numbers in text
        match = re.search(r'\+\d{8,15}', text)
        if match:
            num = re.sub(r'[^\d]', '', match.group(0))
            if num:
                return '+' + num

        # Fallback to author name if it's a number
        num_author = re.sub(r'[^\d]', '', author)
        if num_author and len(num_author) >= 8:
            return '+' + num_author
            
        return None

    for msg in messages:
        text = msg['text']
        
        att_match = attachment_pattern.search(text)
        if not att_match:
            continue
            
        attachment_filename = att_match.group(1).strip()
        # Explicitly skip videos (.mp4), gifs (.gif), or anything that isn't a standard image
        if not re.search(r'\.(jpg|jpeg|png|webp)$', attachment_filename, re.IGNORECASE):
            continue

        phone = extract_phone(text, msg['author'])
        if not phone:
            continue

        description = attachment_pattern.sub('', text).strip()
        
        links = []
        def url_replacer(match):
            links.append(match.group(0))
            return ""
            
        url_pattern = re.compile(r'(?:https?://|www\.|wa\.me/|api\.whatsapp\.com/)[a-zA-Z0-9\-\.\_\~\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\%]+', re.IGNORECASE)
        description = url_pattern.sub(url_replacer, description)
        
        # Remove phone numbers from description
        description = re.sub(r'\+?[\d][\d\s\-]{7,15}', '', description)
        
        description = clean_text(description)
        description = re.sub(r'\s+', ' ', description).strip()
        
        base_filename, _ = os.path.splitext(attachment_filename)
        # We assume the second script will convert them to webp
        image_ref = f"{phone}_{base_filename}.webp"
        
        new_image_name_original_ext = f"{phone}_{attachment_filename}"

        entry = {
            "key": phone,
            "phone": phone,
            "imageRef": image_ref,
            "description": description,
            "links": links,
            "date": msg['date'].isoformat(),
            "source": source_name,
            "_original_image_name": new_image_name_original_ext,
            "_source_image": attachment_filename
        }

        if phone in data:
            existing_date = datetime.fromisoformat(data[phone]['date'])
            if msg['date'] > existing_date:
                data[phone] = entry
        else:
            data[phone] = entry

    # Copy files if requested
    for entry in data.values():
        if images_out_dir:
            source_img_path = os.path.join(chat_dir, entry['_source_image'])
            dest_img_path = os.path.join(images_out_dir, entry['_original_image_name'])
            
            if os.path.exists(source_img_path):
                shutil.copy2(source_img_path, dest_img_path)
            else:
                print(f"Warning: Image {source_img_path} not found on disk.")
                
        # Remove temporary fields used for copying
        del entry['_original_image_name']
        del entry['_source_image']

    return list(data.values())

def main():
    parser = argparse.ArgumentParser(description="Parse WhatsApp export and populate data.json")
    parser.add_argument('--input', required=True, help="Path to WhatsApp _chat.txt file")
    parser.add_argument('--output', required=True, help="Path to save data.json")
    parser.add_argument('--source', help="Source group name. If omitted, uses folder name.")
    parser.add_argument('--copy-images-to', help="Directory to copy and rename the extracted images (format: key+id).")
    
    args = parser.parse_args()
    
    try:
        results = parse_chat(args.input, args.source, args.copy_images_to)
        
        # Merge with existing JSON if it exists
        if os.path.exists(args.output):
            try:
                with open(args.output, 'r', encoding='utf-8') as f:
                    existing_content = f.read().strip()
                    existing_data = json.loads(existing_content) if existing_content else []
                    
                if isinstance(existing_data, list):
                    data_dict = {item['key']: item for item in existing_data if 'key' in item}
                    for item in results:
                        phone = item['key']
                        if phone in data_dict:
                            existing_date = datetime.fromisoformat(data_dict[phone]['date'])
                            new_date = datetime.fromisoformat(item['date'])
                            if new_date > existing_date:
                                data_dict[phone] = item
                        else:
                            data_dict[phone] = item
                    results = list(data_dict.values())
            except Exception as e:
                print(f"Warning: Could not merge with existing data.json: {e}. Overwriting.")

        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully processed {len(results)} unique entries.")
        print(f"Data saved to {args.output}")
        if args.copy_images_to:
            print(f"Images copied and renamed to {args.copy_images_to}")
            
    except Exception as e:
        print(f"Error: {e}")
        exit(1)

if __name__ == "__main__":
    main()
