import json
import os
import sys

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def verify_consistency(extracted_path, index_path):
    print("Loading files...")
    
    # Load Extracted Data
    extracted_data = {}
    try:
        with open(extracted_path, 'r', encoding='utf-8') as f:
            extracted_data = json.load(f)
        print(f"Loaded {len(extracted_data)} entries from {extracted_path}.")
    except Exception as e:
        print(f"Error loading extracted file: {e}")
        return

    # Load Index
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
    except Exception as e:
        print(f"Error loading index file: {e}")
        return
        
    index_main_entries = {}
    # Only care about main_entry items as per protocol
    for item in index_data:
        if item.get('type') == 'main_entry':
            index_main_entries[item['id']] = item
    print(f"Total main_entry items in Index: {len(index_main_entries)}")
        
    # Consistency Logic
    combined_extracted = extracted_data
    
    extracted_ids = set(combined_extracted.keys())
    index_ids = set(index_main_entries.keys())
    
    # Verification 1: Missing IDs (In Index but not in Extracted)
    missing_ids = []
    for i_id in index_ids:
        if i_id not in extracted_ids:
            missing_ids.append(index_main_entries[i_id])
            
    # Verification 2: Extra IDs (In Extracted but not in Index)
    # Note: Sometimes the model might generate cards for sub-entries despite instructions, or hallucinates.
    extra_ids = []
    for e_id in extracted_ids:
        if e_id not in index_ids:
            extra_ids.append(combined_extracted[e_id])

    # Report
    print("\n" + "="*40)
    print("VERIFICATION REPORT")
    print("="*40)
    print(f"Total Index Main Entries: {len(index_main_entries)}")
    print(f"Total Extracted Cards: {len(combined_extracted)}")
    
    if not missing_ids and not extra_ids:
        print("PERFECT MATCH! All ids align perfectly.")
    else:
        print(f"Total Missing Entries: {len(missing_ids)}")
        
        # Group missing by letter
        missing_by_letter = {}
        for m in missing_ids:
            letter = m.get('term', 'Unknown')[0].upper()
            if letter not in missing_by_letter:
                missing_by_letter[letter] = 0
            missing_by_letter[letter] += 1
            
        print("\nMissing Counts by Letter:")
        for letter in sorted(missing_by_letter.keys()):
            print(f"  {letter}: {missing_by_letter[letter]} missing")

        # print(f"Missing Entries ({len(missing_ids)}):")
        # for m in missing_ids:
        #     print(f" - {m['id']}: {m['term']}")
        
        print("\n" + "-"*20 + "\n")
        
        print(f"Extra/Unexpected Entries ({len(extra_ids)}):")
        for e in extra_ids:
             print(f" - {e.get('id', 'Unknown')}: {e.get('term', 'Unknown')}")

if __name__ == "__main__":
    
    extracted_path = 'raw_data/gem25_all_repaired.json'
    if len(sys.argv) > 1:
        extracted_path = sys.argv[1]

    index_path = 'raw_data/Neurology_and_Special_Senses_Index.json'
    
    verify_consistency(extracted_path, index_path)
