import json

path = 'raw_data/extracted_gemini_reply.json'
try:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    types = {}
    for key, value in data.items():
        if isinstance(value, dict):
            p_type = value.get('primaryType', 'UNKNOWN')
            types[p_type] = types.get(p_type, 0) + 1

    print(f"Total items: {len(data)}")
    print(f"Unique primaryTypes: {len(types)}")
    print("-" * 30)
    for t, count in sorted(types.items(), key=lambda item: item[1], reverse=True):
        print(f"{t}: {count}")

except Exception as e:
    print(f"Error: {e}")
