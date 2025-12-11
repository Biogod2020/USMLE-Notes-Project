import json

def manual_resolve():
    input_path = "raw_data/gem25_all_repaired_fuzzy.json"
    output_path = "raw_data/gem25_all_repaired_final.json"
    index_path = "raw_data/Neurology_and_Special_Senses_Index.json"
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    with open(index_path, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
        
    # Helper to find ID by term
    term_to_id = {item['term']: item['id'] for item in index_data}
    
    # Define Explicit Mappings (Slug -> Index Term)
    # These are based on my research of the Unresolved list vs Index
    mappings = {
        "valproic_acid": "Valproate",
        "vagus_nerve": "Vagus nerve (CN X)",
        "gaba": "GABA (γ-aminobutyric acid)",
        "gaba_a_receptor": "GABAA action", # Close enough context
        "neural_tube_defect": "Neural tube", # Target is parent concept
        "spina_bifida": "Spina bifida occulta", # Subtype
        "wernicke_area": "Wernicke (receptive) aphasia", # Associated pathology
        "optic_nerve": "Optic nerve (CN II)", # Likely exists? Checked manually: not in 'O' list?
        # Let's check 'Optic' in Index... 
        # Actually I can't check interactively here. 
        # But "Vagus nerve (CN X)" pattern suggests "Optic nerve (CN II)" might exist?
        # Or maybe "Cranial nerve II"?
        # Safer to map what I SAW in the earlier grep.
    }
    
    # Add resolved IDs to the mapping
    slug_to_id = {}
    for slug, term in mappings.items():
        if term in term_to_id:
            slug_to_id[slug] = term_to_id[term]
        else:
            print(f"Warning: mapped term '{term}' not found in Index!")
            
    # Apply
    fixed_count = 0
    for uid, item in data.items():
        conns = item.get("connections", [])
        for conn in conns:
            target = conn.get("to", "")
            if target in slug_to_id:
                conn['to'] = slug_to_id[target]
                fixed_count += 1
                
    print(f"Manual Repair Fixed: {fixed_count} links")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved final version to {output_path}")

if __name__ == "__main__":
    manual_resolve()
