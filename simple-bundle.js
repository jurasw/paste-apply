const fs = require('fs');
const path = require('path');

function bundleFiles(files, outputFile) {
  let bundled = '(function() {\n';
  const exportedItems = {};

  files.forEach(file => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      
      content = content.replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, '');
      content = content.replace(/^export\s+/gm, '');
      content = content.replace(/export\s+const\s+/g, 'const ');
      content = content.replace(/export\s+function\s+/g, 'function ');
      content = content.replace(/export\s+async\s+function\s+/g, 'async function ');
      content = content.replace(/export\s+{\s*([^}]+)\s*};?/g, (match, exportsList) => {
        const items = exportsList.split(',').map(s => s.trim());
        items.forEach(item => {
          if (item.includes(' as ')) {
            const [original, alias] = item.split(' as ').map(s => s.trim());
            exportedItems[alias] = original;
          } else {
            exportedItems[item] = item;
          }
        });
        return '';
      });
      
      bundled += content + '\n';
    }
  });

  bundled += '})();\n';

  fs.writeFileSync(outputFile, bundled);
  console.log(`✓ Bundled ${outputFile}`);
}

const contentFiles = [
  'content-field-matcher.js',
  'content-field-finder.js',
  'content-form-filler.js',
  'content-button.js',
  'content.js'
];

const popupFiles = [
  'popup-utils.js',
  'popup-resume-parser.js',
  'popup-form-filler.js',
  'popup.js'
];

bundleFiles(contentFiles, 'content.js');
bundleFiles(popupFiles, 'popup.js');

