import json
import re

def list_unresolved():
    path = "raw_data/gem25_all_repaired_fuzzy.json"
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    id_pattern = re.compile(r'^[a-f0-9]{8}$')
    
    unresolved_counts = {}
    
    for uid, item in data.items():
        conns = item.get("connections", [])
        for conn in conns:
            target = conn.get("to", "")
            if not id_pattern.match(target):
                unresolved_counts[target] = unresolved_counts.get(target, 0) + 1
                
    # Sort by freq
    sorted_items = sorted(unresolved_counts.items(), key=lambda x: x[1], reverse=True)
    
    print(f"Total Unique Unresolved Terms: {len(sorted_items)}")
    print("\nTop 50 Unresolved Terms:")
    for term, count in sorted_items[:50]:
        print(f"({count}) {term}")

if __name__ == "__main__":
    list_unresolved()
