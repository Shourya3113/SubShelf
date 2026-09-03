#!/usr/bin/env bash
set -e

echo "📦 Packaging SubDeck for production release..."
npm run typecheck
npm run build

python3 scripts/package.py
