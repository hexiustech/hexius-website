#!/bin/bash

# Check if we're in the project root
if [ ! -f "_config.yml" ] || [ ! -f "Gemfile" ] || [ ! -d "_includes" ]; then
    echo "❌ Error: This script must be run from the project root directory!"
    echo "   Expected files: _config.yml, Gemfile"
    echo "   Expected directory: _includes"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check if token is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN environment variable not set"
    echo "Run: export GITHUB_TOKEN=your_token_here"
    exit 1
fi

echo "Building Jekyll site..."
bundle exec jekyll build

if [ $? -ne 0 ]; then
    echo "Jekyll build failed!"
    exit 1
fi

echo "Deploying to GitHub Pages..."
cd _site

# Initialize git if needed
if [ ! -d .git ]; then
    git init
    git branch -M main
fi

# Configure remote
git remote remove origin 2>/dev/null
git remote add origin https://${GITHUB_TOKEN}@github.com/hexiustech/hexius-website.git

# Deploy
git add -A
git commit -m "Deploy site - $(date '+%Y-%m-%d %H:%M:%S')"
git push -f origin main

echo "✅ Deployment complete!"
cd ..