import json

def fix_errors():
    path = "raw_data/gem25_all_repaired.json"
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    fixed_count = 0
    
    for uid, entry in data.items():
        if entry.get("primaryType") == "pathology":
            entry["primaryType"] = "disease"
            fixed_count += 1
        elif entry.get("primaryType") in ["gene", "genetics"]:
            entry["primaryType"] = "molecule"
            fixed_count += 1
        elif entry.get("primaryType") == "procedure":
            entry["primaryType"] = "concept"
            fixed_count += 1
            
    print(f"Fixed {fixed_count} entries with invalid type 'pathology'.")
    
    if fixed_count > 0:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Updated file saved.")

if __name__ == "__main__":
    fix_errors()
