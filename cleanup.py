import os
import re

def cleanup_file(file_path):
    if not os.path.isfile(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 1. Replace specific domains with generic ones or empty strings
    # Replace 11m9.com and its variants
    content = re.sub(r'https?://(www\.)?11m9\.com', '#', content)
    content = re.sub(r'https?://img\.mpsimg\.com', 'images', content)
    content = re.sub(r'https?://ground\.mpsimg\.com', 'images', content)
    
    # 2. Remove specific brand names if they are in meta tags or titles
    content = content.replace('M9Asia | The most popular online casino in Myanmar', 'Online Casino Myanmar')
    content = content.replace('M9Asia', 'MyCasino')
    content = content.replace('M9asia', 'MyCasino')
    content = content.replace('M9', 'MyCasino')
    
    # 3. Clean up hardcoded URLs in script tags
    # PageConfig.realEnterUrl = location.href; (Already dynamic, but let's be safe)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# Files to clean
files_to_clean = [
    'index.html',
    'sw.js',
    'js/JSUtil.js',
    'js/GameHallUtils.js',
    'css/style.css',
    'css/M9-RWD-R.css'
]

for file in files_to_clean:
    full_path = os.path.join(os.getcwd(), file)
    if os.path.exists(full_path):
        print(f"Cleaning {file}...")
        cleanup_file(full_path)

print("Cleanup completed.")
