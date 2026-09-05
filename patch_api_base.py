import os
import glob

# Path to the React source code
src_dir = r"d:\cs\Hackathon\SentinEX-Ai\frontend\src"

# Find all JSX files
jsx_files = glob.glob(os.path.join(src_dir, "**", "*.jsx"), recursive=True)

# Replace the hardcoded API base URL with an env-aware version
old_str = 'const API_BASE = "http://localhost:8000";'
new_str = 'const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";'

for file_path in jsx_files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file_path}")
