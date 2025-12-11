import json
import re
import os

def extract_gemini_json(input_path, output_path):
    print(f"Reading from {input_path}...")
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading input file: {e}")
        return

    # Navigate to the chunks
    try:
        chunks = data.get('chunkedPrompt', {}).get('chunks', [])
    except AttributeError:
        print("Invalid JSON structure: 'chunkedPrompt' not found.")
        return

    model_text = ""
    found_model = False
    
    # Iterate through chunks to find the model's response
    for chunk in chunks:
        if chunk.get('role') == 'model':
            # Identify parts - sometimes it's a list of parts, sometimes directly text?
            # Based on previous `view_file`, it seems `text` is a direct key in the chunk object from the provided JSON view?
            # Wait, `view_file` showed:
            # { "text": "...", "role": "model", ... "parts": [ { "text": "...", "thought": true ... } ] }
            # It seems the `parts` array contains the thought chain and the final response.
            # Let's inspect the `parts` if available, otherwise look for `text`.
            
            parts = chunk.get('parts', [])
            if parts:
                for part in parts:
                    # We want the text part, but not the thought part unless requested.
                    # The user wants "json reply". Usually, the final response is the one without "thought": true
                    if not part.get('thought', False):
                        model_text += part.get('text', "")
            else:
                # Fallback if no parts structure
                model_text += chunk.get('text', "")
            
            found_model = True

    if not found_model:
        print("No model response found in the chunks.")
        return
    
    if not model_text:
        print("Model response found but text is empty.")
        return

    print("Raw text extracted. Length:", len(model_text))
    
    # Extract all JSON blocks using regex
    # Pattern looks for ```json ... ``` or just ``` ... ```
    # Using non-greedy match .*? with DOTALL
    json_blocks = re.findall(r"```(?:json)?(.*?)```", model_text, re.DOTALL)
    
    if not json_blocks:
        print("No Markdown code blocks found. Trying to parse the entire text as JSON.")
        json_blocks = [model_text]
    else:
        print(f"Found {len(json_blocks)} JSON blocks.")

    final_data = {}
    
    for i, block in enumerate(json_blocks):
        block = block.strip()
        if not block:
            continue
            
        try:
            data = json.loads(block)
            if isinstance(data, dict):
                final_data.update(data)
            elif isinstance(data, list):
                # If it's a list, and final_data is a dict, we might have a problem unless we change strategy.
                # But looking at the debug output, it seems to be a dict of keys (ids).
                # If the first block was a dict, we expect others to be dicts.
                if not final_data and isinstance(final_data, dict):
                     # switch to list if first valid block is list
                     final_data = []
                     final_data.extend(data)
                elif isinstance(final_data, list):
                    final_data.extend(data)
                else:
                    print(f"Warning: Block {i} is a list but accumulated data is a dict. Skipping.")
            else:
                 print(f"Warning: Block {i} is neither dict nor list. Skipping.")

        except json.JSONDecodeError as e:
            print(f"Error parsing block {i}: {e}")
            # Try a fallback for common issues (like trailing commas?) - usually strictly required for standard JSON
            continue

    if not final_data:
         print("Failed to extract any valid JSON data.")
         return

    # Save to output file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
    
    print(f"Success! Cleaned JSON saved to: {output_path}")

if __name__ == "__main__":
    input_file = "/Users/jay/LocalProjects/USMLE-Notes-Project/raw_data/aistudio_chat.json"
    output_file = "/Users/jay/LocalProjects/USMLE-Notes-Project/raw_data/extracted_gemini_reply.json"
    extract_gemini_json(input_file, output_file)
