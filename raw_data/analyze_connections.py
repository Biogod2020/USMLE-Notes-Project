import json

def analyze_connections():
    repaired_path = "raw_data/gem25_all_repaired.json"
    original_path = "raw_data/gem25section1_extracted.json"
    
    print("Loading files...")
    with open(repaired_path, 'r', encoding='utf-8') as f:
        repaired = json.load(f)
        
    with open(original_path, 'r', encoding='utf-8') as f:
        original = json.load(f)
        
    print(f"Repaired Total: {len(repaired)}")
    print(f"Original (Section 1) Total: {len(original)}")
    
    # 1. Check Repaired Connections Stats
    repaired_empty = 0
    repaired_populated = 0
    repaired_missing_key = 0
    
    for uid, item in repaired.items():
        conns = item.get("connections")
        if conns is None:
            repaired_missing_key += 1
        elif len(conns) == 0:
            repaired_empty += 1
        else:
            repaired_populated += 1
            
    print("\n--- Repaired File Stats ---")
    print(f"Entries with populated connections: {repaired_populated} ({repaired_populated/len(repaired)*100:.1f}%)")
    print(f"Entries with EMPTY connections: {repaired_empty}")
    print(f"Entries MISSING 'connections' key: {repaired_missing_key}")
    
    # 2. Check overlap integrity
    # Did we lose connections for items that were in the original?
    print("\n--- Integrity Check (Original vs Repaired) ---")
    degraded_count = 0
    for uid, orig_item in original.items():
        if uid in repaired:
            rep_item = repaired[uid]
            orig_conns = orig_item.get("connections", [])
            rep_conns = rep_item.get("connections", [])
            
            if len(orig_conns) > len(rep_conns):
                print(f"WARNING: ID {uid} lost connections! Orig: {len(orig_conns)}, Repaired: {len(rep_conns)}")
                degraded_count += 1
                if degraded_count < 5:
                    print(f"  Orig: {orig_conns}")
                    print(f"  Rep:  {rep_conns}")
    
    if degraded_count == 0:
        print("Verification PASS: No connections were lost from the originally successful extractions.")
    else:
        print(f"Verification FAIL: {degraded_count} entries lost connections during repair.")

    # 3. Check the "Recovered" ones (in Repaired but NOT in Original)
    print("\n--- Newly Recovered Entries Stats ---")
    new_ids = set(repaired.keys()) - set(original.keys())
    print(f"Total New Entries: {len(new_ids)}")
    
    new_populated = 0
    new_empty = 0
    
    for uid in new_ids:
        item = repaired[uid]
        conns = item.get("connections", [])
        if conns:
            new_populated += 1
        else:
            new_empty += 1
            
    print(f"New entries with connections: {new_populated}")
    print(f"New entries with EMPTY connections: {new_empty}")
    if new_empty > 0:
        # Sample a few empty ones to see if they look truncated in source (by looking at the json)
        print("Sample empty connection entries:")
        for uid in list(new_ids)[:5]:
             if not repaired[uid].get("connections"):
                 print(f" - {uid}: {repaired[uid].get('title')}")

analyze_connections()
