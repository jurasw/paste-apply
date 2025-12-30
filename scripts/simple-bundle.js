const fs = require('fs');
const path = require('path');

function resolveImports(content, filePath, processedFiles = new Set()) {
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"];?/g;
  const dir = path.dirname(filePath);
  let resolvedContent = content;
  const imports = [];
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const fullImportPath = path.resolve(dir, importPath.replace(/\.js$/, ''));
    const possiblePaths = [
      fullImportPath + '.js',
      path.resolve(dir, importPath) + '.js',
      path.resolve(dir, importPath.replace(/^\.\//, '')) + '.js'
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath) && !processedFiles.has(possiblePath)) {
        imports.push(possiblePath);
        break;
      }
    }
  }
  
  return { resolvedContent, imports };
}

function bundleFiles(files, outputFile, baseDir = '.') {
  let bundled = '(function() {\n';
  const processedFiles = new Set();
  const fileQueue = files.map(f => path.resolve(baseDir, f));
  
  while (fileQueue.length > 0) {
    const filePath = fileQueue.shift();
    
    if (processedFiles.has(filePath) || !fs.existsSync(filePath)) {
      continue;
    }
    
    processedFiles.add(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    
    const { imports } = resolveImports(content, filePath, processedFiles);
    imports.forEach(imp => {
      if (!fileQueue.includes(imp)) {
        fileQueue.unshift(imp);
      }
    });
    
    content = content.replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, '');
    content = content.replace(/^export\s+/gm, '');
    content = content.replace(/export\s+const\s+/g, 'const ');
    content = content.replace(/export\s+function\s+/g, 'function ');
    content = content.replace(/export\s+async\s+function\s+/g, 'async function ');
    content = content.replace(/export\s+{\s*([^}]+)\s*};?/g, (match, exportsList) => {
      return '';
    });
    
    bundled += content + '\n';
  }

  bundled += '})();\n';

  fs.writeFileSync(outputFile, bundled);
  console.log(`✓ Bundled ${outputFile}`);
}

const contentFiles = [
  'src/content/field-matcher.js',
  'src/content/utils.js',
  'src/content/field-finder.js',
  'src/content/form-filler.js',
  'src/content/button.js',
  'src/content/init.js',
  'src/content.js'
];

const popupFiles = [
  'src/popup/utils.js',
  'src/popup/validation.js',
  'src/popup/field-matcher.js',
  'src/popup/field-filler.js',
  'src/popup/field-finder.js',
  'src/popup/file-upload.js',
  'src/popup/resume-parser.js',
  'src/popup/form-filler.js',
  'src/popup/init.js',
  'src/popup.js'
];

bundleFiles(contentFiles, 'src/content.js');
bundleFiles(popupFiles, 'src/popup.js');
