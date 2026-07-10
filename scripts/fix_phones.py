import json
import os
import re

def fix():
    json_path = 'scripts/data.json'
    img_dir = 'scripts/temp/images'
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    fixed = 0
    for item in data:
        old_phone = item['key']
        new_phone = "+" + re.sub(r'[^\d]', '', old_phone)
        
        if old_phone != new_phone:
            print(f"Fixing {old_phone} -> {new_phone}")
            
            # fix entry
            item['key'] = new_phone
            item['phone'] = new_phone
            
            # fix imageRef
            old_ref = item['imageRef']
            new_ref = old_ref.replace(old_phone, new_phone)
            item['imageRef'] = new_ref
            
            # rename physical file if exists
            old_img_path = os.path.join(img_dir, old_ref)
            new_img_path = os.path.join(img_dir, new_ref)
            
            if os.path.exists(old_img_path):
                os.rename(old_img_path, new_img_path)
                print(f"Renamed {old_img_path} to {new_img_path}")
            
            fixed += 1
            
    if fixed > 0:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Fixed {fixed} entries in data.json")
    else:
        print("No malformed phones found!")

fix()
