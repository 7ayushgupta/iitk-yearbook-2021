#!/usr/bin/env python3
"""
Extract usernames from all .dat files in archive/chhaatr-khoj-data/data/
Each file format: rollno | name | program | department | hostel | username | gender
Username is the 6th field (index 5 when split by ' | ')
"""

import os
import json
from pathlib import Path

def extract_usernames(data_dir):
    """Extract all unique usernames from .dat files"""
    usernames = set()
    data_path = Path(data_dir)
    
    if not data_path.exists():
        print(f"Error: Directory {data_dir} does not exist")
        return []
    
    dat_files = list(data_path.glob("*.dat"))
    print(f"Found {len(dat_files)} .dat files")
    
    for dat_file in dat_files:
        try:
            with open(dat_file, 'r', encoding='utf-8') as f:
                line = f.readline().strip()
                if line:
                    # Split by ' | ' to get fields
                    fields = line.split(' | ')
                    if len(fields) >= 6:
                        username = fields[5].strip()
                        if username:  # Only add non-empty usernames
                            usernames.add(username)
        except Exception as e:
            print(f"Error processing {dat_file.name}: {e}")
            continue
    
    return sorted(list(usernames))

def main():
    # Get the script directory and construct paths (go up one level from scripts/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    data_dir = project_root / "archive" / "chhaatr-khoj-data" / "data"
    output_file = project_root / "public" / "data" / "usernames.json"
    
    print(f"Extracting usernames from: {data_dir}")
    usernames = extract_usernames(data_dir)
    
    print(f"Found {len(usernames)} unique usernames")
    
    # Create output directory if it doesn't exist
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Write to JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(usernames, f, indent=2)
    
    print(f"Usernames saved to: {output_file}")
    print(f"First 10 usernames: {usernames[:10]}")

if __name__ == "__main__":
    main()

