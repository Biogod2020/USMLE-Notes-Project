import json
import re
import difflib

def normalize(text):
    # Convert "valproic_acid" -> "valproic acid"
    return text.lower().replace("_", " ").strip()

def fuzzy_resolve():
    input_path = "raw_data/gem25_all_repaired.json"
    output_path = "raw_data/gem25_all_repaired_fuzzy.json"
    index_path = "raw_data/Neurology_and_Special_Senses_Index.json"
    
    print("Loading data...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    with open(index_path, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
        
    # Build a dictionary of {normalized_term: id} from the Index
    # We want to map TO valid IDs only.
    # Also include titles from the data itself (if they have IDs)
    
    term_map = {}
    
    # 1. From Index
    for item in index_data:
        term = item.get('term', '')
        uid = item.get('id')
        if term and uid:
            norm = normalize(term)
            term_map[norm] = uid
            
            # Optional: Add reversed "Acid, Valproic" -> "valproic acid"
            if "," in term:
                parts = [p.strip() for p in term.split(',')]
                if len(parts) == 2:
                    reversed_term = f"{parts[1]} {parts[0]}"
                    term_map[normalize(reversed_term)] = uid

    # 2. From Existing Data (Self-reference)
    for uid, item in data.items():
        title = item.get('title', '')
        if title:
            term_map[normalize(title)] = uid

    print(f"Index size (unique terms): {len(term_map)}")
    
    # Prepare for fuzzy matching
    # We get a list of all valid normalized terms to match against
    valid_terms = list(term_map.keys())
    
    id_pattern = re.compile(r'^[a-f0-9]{8}$')
    
    fixed_count = 0
    total_unresolved = 0
    
    print("Starting fuzzy resolution...")
    
    for uid, item in data.items():
        conns = item.get("connections", [])
        new_conns = []
        
        for conn in conns:
            target = conn.get("to", "")
            
            # If it's already an ID, keep it
            if id_pattern.match(target):
                new_conns.append(conn)
                continue
            
            # It's a slug/name
            total_unresolved += 1
            slug_norm = normalize(target)
            
            # 1. Exact Match (after broader normalization)
            if slug_norm in term_map:
                conn['to'] = term_map[slug_norm]
                new_conns.append(conn)
                fixed_count += 1
                continue
                
            # 2. Substring Heuristic
            # If slug is "sternocleidomastoid_muscle" and term is "sternocleidomastoid"
            # Or vice versa.
            # This is risky, so verify length diff.
            
            # 3. Fuzzy Match
            # get_close_matches returns list, default cutoff=0.6. We want strictly 0.8+
            matches = difflib.get_close_matches(slug_norm, valid_terms, n=1, cutoff=0.8)
            
            if matches:
                best_match = matches[0]
                resolved_id = term_map[best_match]
                # print(f"  Fuzzy Fixed: '{target}' -> '{best_match}' ({resolved_id})")
                conn['to'] = resolved_id
                fixed_count += 1
                new_conns.append(conn)
            else:
                # Still unresolved
                # print(f"  Failed: '{target}'")
                new_conns.append(conn) # Keep the slug
        
        item['connections'] = new_conns

    print(f"\nRepair Summary:")
    print(f"Processed {total_unresolved} unresolved links.")
    print(f"Successfully Resolved: {fixed_count}")
    print(f"Remaining Unresolved: {total_unresolved - fixed_count}")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    fuzzy_resolve()
