const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  path.join(root, 'node_modules', 'html2canvas', 'dist', 'html2canvas.js'),
  path.join(root, 'node_modules', 'html2canvas', 'dist', 'html2canvas.esm.js')
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const target = 'throw new Error("Attempting to parse an unsupported color function \\"" + value.name + "\\"");';
    if (content.includes(target)) {
      content = content.replace(target, 'return 0;');
      fs.writeFileSync(file, content, 'utf8');
      fs.writeFileSync(path.join(root, 'scripts', 'patch-log.txt'), 'Patched ' + file + '\n', { flag: 'a' });
    } else {
      fs.writeFileSync(path.join(root, 'scripts', 'patch-log.txt'), 'Target not found in ' + file + '\n', { flag: 'a' });
    }
  } else {
    fs.writeFileSync(path.join(root, 'scripts', 'patch-log.txt'), 'Not found: ' + file + '\n', { flag: 'a' });
  }
}
