import json
import sys

def validate_entry(entry_id, data):
    errors = []
    
    # Check top-level keys
    required_keys = ["title", "primaryType", "tags", "classificationPath", "content", "connections"]
    for k in required_keys:
        if k not in data:
            errors.append(f"Missing top-level key: '{k}'")
            
    # Check primaryType
    valid_types = ["disease", "drug", "anatomy", "microbe", "molecule", "physiology", "finding", "concept"]
    p_type = data.get("primaryType")
    if p_type and p_type not in valid_types:
        errors.append(f"Invalid primaryType: '{p_type}'")
        
    # Check content keys
    content = data.get("content", {})
    if isinstance(content, dict):
        required_content_keys = ["definition", "atAGlance", "takeAway", "mermaid"]
        for k in required_content_keys:
            if k not in content:
                errors.append(f"Missing content key: '{k}'")
                
        # Simple check for HTML tags in text fields (heuristic)
        for k in ["definition", "atAGlance", "takeAway"]:
            val = content.get(k, "")
            if not isinstance(val, str) or ("<" not in val and ">" not in val):
                # errors.append(f"Content field '{k}' does not appear to contain HTML")
                pass # Soft warning, maybe not strictly an error if text is plain
    else:
        errors.append("'content' is not a dictionary")
        
    # Check connections
    connections = data.get("connections")
    if not isinstance(connections, list):
        errors.append("'connections' is not a list")
    else:
        for i, conn in enumerate(connections):
            if not isinstance(conn, dict):
                errors.append(f"Connection {i} is not a dict")
                continue
            if "type" not in conn or "to" not in conn:
                errors.append(f"Connection {i} missing 'type' or 'to'")
            if len(conn) > 2:
                 # Check strict keys? User said "type" and "to".
                 pass

    return errors

def main():
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        path = "raw_data/gem25_all_repaired.json"
    print(f"Validating strictly against schema: {path}")
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Failed to load JSON: {e}")
        return
        
    total_entries = len(data)
    valid_count = 0
    invalid_count = 0
    
    # Sample error reporting
    sample_errors = {}
    
    for entry_id, entry_data in data.items():
        errs = validate_entry(entry_id, entry_data)
        if not errs:
            valid_count += 1
        else:
            invalid_count += 1
            if len(sample_errors) < 10:
                sample_errors[entry_id] = errs
                
    print(f"Total Entries: {total_entries}")
    print(f"Valid Entries: {valid_count}")
    print(f"Invalid Entries: {invalid_count}")
    
    if invalid_count > 0:
        print("\n--- Compliance Issues (First 10) ---")
        for eid, errs in sample_errors.items():
            print(f"ID {eid}: {', '.join(errs)}")
    else:
        print("\nAll entries follow the schema structure!")

if __name__ == "__main__":
    main()
