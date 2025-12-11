import json
import re

def analyze_links():
    path = "raw_data/gem25_all_repaired.json"
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    id_pattern = re.compile(r'^[a-f0-9]{8}$')
    
    total_links = 0
    valid_id_links = 0
    slug_links = 0
    subset_slugs = []
    
    for uid, item in data.items():
        conns = item.get("connections", [])
        for conn in conns:
            total_links += 1
            target = conn.get("to", "")
            
            if id_pattern.match(target):
                valid_id_links += 1
            else:
                slug_links += 1
                if len(subset_slugs) < 10:
                    subset_slugs.append(target)
                    
    print(f"Total Connections: {total_links}")
    print(f"Valid IDs: {valid_id_links}")
    print(f"Slug/Name Links: {slug_links} ({slug_links/total_links*100:.1f}%)")
    
    if subset_slugs:
        print("\nExample Slug Links:")
        for s in subset_slugs:
            print(f" - {s}")

if __name__ == "__main__":
    analyze_links()
