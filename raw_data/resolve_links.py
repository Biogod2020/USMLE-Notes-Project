import json
import re

def normalize_key(text):
    # Aggressive snake case: replace non-alphanumeric with _, strip _
    # e.g. "Abducens Nerve (CN VI)" -> "abducens_nerve_cn_vi"
    # Also "Valproic Acid" -> "valproic_acid"
    
    # 1. Lowercase
    s = text.lower()
    # 2. Replace common separators
    s = s.replace(" ", "_")
    s = s.replace("-", "_")
    
    # 3. Remove parentheses content? OR keep it?
    # The example "sternocleidomastoid_muscle" implies "Sternocleidomastoid" 
    # but maybe the title was "Sternocleidomastoid Muscle"?
    
    # Let's try simple regex: keep a-z0-9, replace others with _
    s = re.sub(r'[^a-z0-9]+', '_', s)
    s = s.strip('_')
    return s

def normalize_simple(text):
    # Just space to underscore
    return text.lower().replace(" ", "_")

def simple_clean(text):
    # remove () []
    s = re.sub(r'[\(\[\].*?[\)\]]', '', text)
    return normalize_key(s)

def resolve_links(dry_run=True):
    repaired_path = "raw_data/gem25_all_repaired.json"
    index_path = "raw_data/Neurology_and_Special_Senses_Index.json"
    
    with open(repaired_path, 'r', encoding='utf-8') as f:
        repaired = json.load(f)
        
    with open(index_path, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
        
    # Build Lookup Table
    # map[slug] = id
    slug_map = {}
    
    # Helper to add 
    def add_to_map(name, uid):
        if not name: return
        n1 = normalize_key(name)
        n2 = normalize_simple(name)
        # n3 = simple_clean(name) # "Abducens Nerve" from "Abducens Nerve (CN VI)"
        
        slug_map[n1] = uid
        slug_map[n2] = uid
        # slug_map[n3] = uid
        
    # 1. Add from Index (Ground Truth)
    for item in index_data:
        add_to_map(item.get('term', ''), item.get('id'))
        
    # 2. Add from Repaired (Extracted Titles) - Overwrite/Supplement
    for uid, item in repaired.items():
        add_to_map(item.get('title', ''), uid)
        
    print(f"Built Lookup Map with {len(slug_map)} keys.")
    
    # Resolve
    fixed_count = 0
    failed_count = 0
    already_valid_count = 0
    
    id_pattern = re.compile(r'^[a-f0-9]{8}$')
    
    failed_samples = []
    
    for uid, item in repaired.items():
        conns = item.get("connections", [])
        new_conns = []
        changed = False
        
        for conn in conns:
            target = conn.get("to", "")
            
            if id_pattern.match(target):
                already_valid_count += 1
                new_conns.append(conn)
            else:
                # Try to resolve
                # The slug might be "valproic_acid"
                # Check direct map
                resolved_id = slug_map.get(target)
                
                # If not found, try normalizing the target itself?
                # The target is ALREADY a slug usually.
                # So we just look it up.
                
                if resolved_id:
                    conn['to'] = resolved_id
                    fixed_count += 1
                    changed = True
                    new_conns.append(conn)
                else:
                    # Look harder? 
                    # specific manual mappings could go here
                    failed_count += 1
                    if len(failed_samples) < 20:
                        failed_samples.append(target)
                    new_conns.append(conn)
        
        if not dry_run:
            item['connections'] = new_conns

    print(f"Skipped (Already Valid): {already_valid_count}")
    print(f"Fixed Slugs: {fixed_count}")
    print(f"Failed to Resolve: {failed_count}")
    
    if failed_samples:
        print("\nUnresolved Samples:")
        for s in failed_samples:
            print(f" - {s}")
            
    if not dry_run and fixed_count > 0:
        with open(repaired_path, 'w', encoding='utf-8') as f:
            json.dump(repaired, f, indent=2, ensure_ascii=False)
        print(f"Saved repairs to {repaired_path}")

if __name__ == "__main__":
    resolve_links(dry_run=False)
