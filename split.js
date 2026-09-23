const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

// Extract CSS
const styleRegex = /<style>([\s\S]*?)<\/style>/;
const styleMatch = html.match(styleRegex);
if (styleMatch) {
  const css = styleMatch[1].trim();
  fs.mkdirSync(path.join(__dirname, 'css'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'css', 'style.css'), css);
  
  // Replace <style> block with <link>
  html = html.replace(styleRegex, '<link rel="stylesheet" href="css/style.css">');
}

// Extract main JS
const scriptRegex = /<script>\s*\/\/\s*============================================================\s*\n\s*\/\/\s*SELOSS STORE — Main Application Script v1\.0([\s\S]*?)<\/script>/;
const scriptMatch = html.match(scriptRegex);
if (scriptMatch) {
  const js = '// ============================================================\n//  SELOSS STORE — Main Application Script v1.0' + scriptMatch[1].trim();
  fs.mkdirSync(path.join(__dirname, 'js'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'js', 'main.js'), js);
  
  // Replace <script> block with <script type="module" src="js/main.js">
  html = html.replace(scriptRegex, '<script type="module" src="js/main.js"></script>');
}

fs.writeFileSync(indexPath, html);
console.log('Successfully extracted CSS and JS from index.html');
