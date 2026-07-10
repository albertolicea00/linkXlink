#!/bin/bash
# populate_data.sh
# Automates the extraction and merging of all dumps into data.json

echo "Resetting data.json..."
echo "[]" > scripts/data.json

echo "1. Extracting from WhatsApp Chat Export..."
python3 scripts/1_extract_from_txt.py \
    --input "scripts/backup/WhatsApp Chat - ★ Link ❌ Link ★/_chat.txt" \
    --output "scripts/data.json" \
    --copy-images-to "scripts/temp/images"

for i in {1..5}; do
    DUMP_FILE="scripts/backup/whatsapp_dump_${i}.json"
    DUMP_DIR="scripts/backup/whatsapp_dump_${i}"
    
    echo "-----------------------------------"
    echo "Processing Dump $i..."
    if [ -f "$DUMP_FILE" ]; then
        python3 scripts/2_unpack_web_dump.py --input "$DUMP_FILE"
        
        # Merge it into data.json.
        # Since the images are now in scripts/backup/whatsapp_dump_${i}, 
        # and we want everything easily accessible for nsfw/gender/migration scripts
        # we should probably copy them to scripts/temp/images too.
        
        # Merge JSON
        python3 scripts/3_merge_data.py \
            --input "${DUMP_DIR}/extracted_data.json" \
            --main "scripts/data.json"
            
        # Move images to temp/images so they are all in one centralized place
        # This makes nsfw and gender and optimize scripts work seamlessly
        echo "Copying images to scripts/temp/images..."
        cp ${DUMP_DIR}/*.webp scripts/temp/images/ 2>/dev/null
    else
        echo "File $DUMP_FILE not found."
    fi
done

echo "-----------------------------------"
echo "Population Complete! Current valid counts:"
./scripts/count_valid.sh
