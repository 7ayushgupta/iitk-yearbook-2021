#!/usr/bin/env python3
"""
Extract username to name mapping from all .dat files
Creates a JSON file mapping username -> full name
"""

import os
import json
from pathlib import Path

def extract_username_mapping(data_dir):
    """Extract username to name mapping from .dat files"""
    username_map = {}
    data_path = Path(data_dir)
    
    if not data_path.exists():
        print(f"Error: Directory {data_dir} does not exist")
        return {}
    
    dat_files = list(data_path.glob("*.dat"))
    print(f"Found {len(dat_files)} .dat files")
    
    for dat_file in dat_files:
        try:
            with open(dat_file, 'r', encoding='utf-8') as f:
                line = f.readline().strip()
                if line:
                    # Split by ' | ' to get fields
                    # Format: rollno | name | program | department | hostel | username | gender
                    fields = line.split(' | ')
                    if len(fields) >= 6:
                        name = fields[1].strip()
                        username = fields[5].strip().lower()
                        if username and name:
                            username_map[username] = name
        except Exception as e:
            print(f"Error processing {dat_file.name}: {e}")
            continue
    
    return username_map

def main():
    # Get the script directory and construct paths
    script_dir = Path(__file__).parent
    data_dir = script_dir / "archive" / "chhaatr-khoj-data" / "data"
    output_file = script_dir / "public" / "data" / "username_to_name.json"
    
    print(f"Extracting username mapping from: {data_dir}")
    username_map = extract_username_mapping(data_dir)
    
    print(f"Found {len(username_map)} username mappings")
    
    # Create output directory if it doesn't exist
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Write to JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(username_map, f, indent=2)
    
    print(f"Username mapping saved to: {output_file}")
    print(f"Sample mappings (first 5):")
    for i, (username, name) in enumerate(list(username_map.items())[:5]):
        print(f"  {username} -> {name}")

if __name__ == "__main__":
    main()

