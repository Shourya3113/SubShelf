#!/usr/bin/env python3
"""
SubDeck Production Packaging Script
Packages the dist/ directory into a Chrome Web Store compliant zip file.
Ensures manifest.json is at the root of the zip archive.
"""

import os
import sys
import zipfile
import json

def package_extension():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(project_root, 'dist')
    manifest_path = os.path.join(dist_dir, 'manifest.json')

    if not os.path.exists(manifest_path):
        print("❌ Error: dist/manifest.json not found. Run 'npm run build' first.")
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
        version = manifest.get('version', '1.0.0')

    zip_filename = f"subdeck-v{version}.zip"
    zip_path = os.path.join(project_root, zip_filename)

    print(f"📦 Packaging SubDeck v{version} into {zip_filename}...")

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # Archive name relative to dist/ so manifest.json is at the root
                arcname = os.path.relpath(file_path, dist_dir)
                zipf.write(file_path, arcname)
                print(f"  + {arcname}")

    zip_size_kb = os.path.getsize(zip_path) / 1024
    print(f"\n✅ Successfully created {zip_filename} ({zip_size_kb:.1f} KB)")
    print(f"📍 Location: {zip_path}")
    print("🚀 Ready for upload to Chrome Web Store Developer Dashboard!")

if __name__ == '__main__':
    package_extension()
