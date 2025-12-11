import json
import re
import sys

def extract_model_text(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except:
        return ""
    
    text = ""
    chunks = data.get('chunkedPrompt', {}).get('chunks', [])
    for chunk in chunks:
        if chunk.get('role') == 'model':
             parts = chunk.get('parts', [])
             if parts:
                 for part in parts:
                     text += part.get('text', "")
             else:
                 text += chunk.get('text', "")
    return text

def recover_from_text(text, filename=""):
    # Find all potential JSON blocks
    # We use a loose regex to catch blocks that might not be strictly closed
    # This finds the content between ```json and ``` OR just the start
    # But usually the model produces multiple blocks.
    
    # Strategy: Find all start markers, and assume they end at the next marker or EOF?
    # Or just use the existing re.findall but handle the content more smartly.
    
    # Let's try to extract all TOP LEVEL keys that look like IDs.
    # Pattern: "id_string": { ... }
    # We will search the ENTIRE text for this pattern, ignoring block boundaries 
    # (since block boundaries are just markdown formatting).
    
    print(f"Scanning {filename} ({len(text)} chars)...")
    
    # Pattern for the key: "hexnull": {
    # 8 chars hex usually.
    # regex: \"[a-f0-9]{8}\"\s*:\s*\{
    
    pattern = re.compile(r'\"([a-f0-9]{8})\"\s*:\s*\{')
    
    re_matches = list(pattern.finditer(text))
    print(f"  Found {len(re_matches)} potential item starts.")
    
    recovered_items = {}
    failed_count = 0
    
    for match in re_matches:
        start_index = match.end() - 1 # point to the opening {
        # Now we need to find the matching closing }
        # We use a brace counter.
        
        brace_count = 0
        in_string = False
        escape = False
        
        end_index = -1
        
        # Scan forward from start_index
        # Limit scan to avoid hanging on massive text? 100k chars should be enough for one card.
        scan_limit = min(len(text), start_index + 50000) 
        
        for i in range(start_index, scan_limit):
            char = text[i]
            
            if in_string:
                if char == '\\':
                    escape = not escape
                elif char == '"' and not escape:
                    in_string = False
                else:
                    escape = False
            else:
                if char == '"':
                    in_string = True
                elif char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_index = i + 1
                        break
        
        if end_index != -1:
            # Candidate json string
            json_str = text[start_index:end_index]
            item_id = match.group(1)
            
            try:
                # Validate by parsing
                obj = json.loads(json_str)
                recovered_items[item_id] = obj
            except json.JSONDecodeError:
                # print(f"    Failed to parse recovered block for {item_id}")
                failed_count += 1
        else:
            # Could not find closing brace
            failed_count += 1

    print(f"  Successfully recovered: {len(recovered_items)}")
    print(f"  Failed candidates: {failed_count}")
    return recovered_items

def main():
    files = [
        'raw_data/gem25section1.json',
        'raw_data/gem25section2.json'
    ]
    
    total_recovered = {}
    
    for f in files:
        text = extract_model_text(f)
        items = recover_from_text(text, f)
        total_recovered.update(items)
        
    print("\n" + "="*30)
    print(f"TOTAL RECOVERED UNIQUE ENTRIES: {len(total_recovered)}")
    
    # Save to a new 'repaired' file
    out_path = 'raw_data/gem25_all_repaired.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(total_recovered, f, indent=2, ensure_ascii=False)
    print(f"Saved recovered data to {out_path}")

if __name__ == "__main__":
    main()
