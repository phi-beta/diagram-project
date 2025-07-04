#!/usr/bin/env node
// update-versions.js - Simple script to update all version numbers

const fs = require('fs');
const path = require('path');

const version = process.argv[2] || Date.now().toString();

// Files to update
const files = [
  'js/renderer.js',
  'index.html',
  'test-edge-creation.html',
  'test-selection-fix.html'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Update version numbers in imports and script tags
    content = content.replace(/\?v=\d+/g, `?v=${version}`);
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file} to version ${version}`);
  }
});

console.log(`All files updated to version ${version}`);
