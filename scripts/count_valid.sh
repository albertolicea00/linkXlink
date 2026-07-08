#!/bin/bash
# ==============================================================================
# Contact Validation & Statistics Dashboard
# ==============================================================================
#
# This shell script provides a quick summary of the master `data.json` database.
# It counts the total number of contacts and categorizes them by their "valid"
# flag (set by fix_validation.py).
# 
# Additionally, it performs integrity checks by:
# 1. Verifying if the image files referenced in the JSON actually exist on disk.
# 2. Checking for duplicate phone numbers across the database.
#
# Usage:
# ------
# $ ./scripts/count_valid.sh
# ==============================================================================

JSON_FILE="scripts/data.json"
IMG_DIR="scripts/temp/images"

if [ ! -f "$JSON_FILE" ]; then
    echo "Error: $JSON_FILE not found!"
    exit 1
fi

VALID_COUNT=$(grep -c '"valid": true' "$JSON_FILE" || echo "0")
INVALID_COUNT=$(grep -c '"valid": false' "$JSON_FILE" || echo "0")
TOTAL=$(($VALID_COUNT + $INVALID_COUNT))

# Use python to quickly check image references, duplicates, and NSFW flags.
# Capture output into a plain variable FIRST, then split it — feeding a live
# unquoted command substitution straight into `<<<` under a prefix-scoped IFS
# is fragile across shells (bash vs zsh, or invocation via `sh`) and can land
# everything in the first field with the rest blank.
PY_STATS=$(python3 -c "
import json, os, sys
from collections import Counter
try:
    data = json.load(open('$JSON_FILE', 'r', encoding='utf-8'))
    missing = sum(1 for item in data if not os.path.isfile(os.path.join('$IMG_DIR', item.get('imageRef', ''))))
    keys = [item.get('key') for item in data]
    counts = Counter(keys)
    duplicates = sum(count - 1 for count in counts.values() if count > 1)
    nsfw = sum(1 for item in data if item.get('nsfw', False))
    males = sum(1 for item in data if item.get('gender') == 'male')
    females = sum(1 for item in data if item.get('gender') == 'female')
    others = sum(1 for item in data if item.get('gender') == 'other')
    print(f'{missing};{duplicates};{nsfw};{males};{females};{others}')
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    print('0;0;0;0;0;0')
")
IFS=';' read -r MISSING_IMAGES DUPLICATES NSFW_IMAGES MALES FEMALES OTHERS <<< "$PY_STATS"

echo "============================="
echo "   CONTACT VALIDATION STATS  "
echo "============================="
echo "🟢 Valid Contacts  : $VALID_COUNT"
echo "🔴 Invalid Contacts: $INVALID_COUNT"
echo "-----------------------------"
echo "👨 Males Detected  : $MALES"
echo "👩 Females Detected: $FEMALES"
echo "👤 Undetected/Other: $OTHERS"
echo "-----------------------------"
echo "🖼️  Missing Images  : $MISSING_IMAGES (References not found)"
echo "⚠️  Duplicate Phones: $DUPLICATES (Entries with same number)"
echo "🔞 NSFW Content    : $NSFW_IMAGES (Auto-flagged)"
echo "-----------------------------"
echo "📊 Total Evaluated : $TOTAL"
echo "============================="
