import json

def check_synonyms():
    index_path = "raw_data/Neurology_and_Special_Senses_Index.json"
    with open(index_path, 'r', encoding='utf-8') as f:
        index_data = json.load(f)
        
    terms = [item.get('term', '') for item in index_data]
    
    # List of queries based on my hypothesis
    queries = [
        "Meningitis",
        "Neural tube",
        "GABA",
        "Antipsychotic",
        "Neuroleptic",
        "Valpro",
        "Myasthenia",
        "Wernicke",
        "Vagus",
        "Sodium channel",
        "Staph",
        "Spina bifida",
        "Fourth ventricle",
        "Flumazenil" # Check exact match?
    ]
    
    print(f"Scanning Index ({len(terms)} terms) for matches...")
    
    for q in queries:
        print(f"\n--- Matches for '{q}' ---")
        matches = [t for t in terms if q.lower() in t.lower()]
        for m in matches:
            print(f" - {m}")

if __name__ == "__main__":
    check_synonyms()
