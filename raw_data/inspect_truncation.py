import json
import re

def inspect():
    path = 'raw_data/gem25section2.json'
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print("The file 'gem25section2.json' ITSELF is invalid/truncated.")
        return

    # If file is valid, look for the model text
    chunks = data.get('chunkedPrompt', {}).get('chunks', [])
    model_text = ""
    for chunk in chunks:
        if chunk.get('role') == 'model':
             parts = chunk.get('parts', [])
             if parts:
                 for part in parts:
                     model_text += part.get('text', "")
             else:
                 model_text += chunk.get('text', "")

    print("\n--- Inspecting JSON Blocks ---")
    json_blocks = re.findall(r"```(?:json)?(.*?)```", model_text, re.DOTALL)
    print(f"Found {len(json_blocks)} complete JSON blocks.")
    
    # We are interested in Block 2 (0, 1, 2) i.e. the 3rd one
    if len(json_blocks) > 2:
        block_2 = json_blocks[2]
        print("\n--- BLOCK 2 CONTENT (First 200 chars) ---")
        print(block_2[:200])
        print("\n--- BLOCK 2 CONTENT (Last 200 chars) ---")
        print(block_2[-200:])
        
        # Try processing it to reproduce the error
        try:
            json.loads(block_2)
            print("\nBlock 2 parses correctly.")
        except json.JSONDecodeError as e:
            print(f"\nBlock 2 Parse Error: {e}")
            # Locate the error context
            lines = block_2.splitlines()
            if e.lineno <= len(lines):
                error_line = lines[e.lineno - 1]
                print(f"Error Line ({e.lineno}): {error_line}")
                print(f"Pointer: {' ' * (e.colno - 1)}^")
    else:
        print("Block 2 not found.")

if __name__ == "__main__":
    inspect()
