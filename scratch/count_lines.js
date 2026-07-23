const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.next', '.git', '.agents', '.temp', 'package-lock.json', 'tsconfig.tsbuildinfo'].includes(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const root = process.cwd();
const files = getFiles(root);
let totalLines = 0;
const results = [];

for (const f of files) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  try {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split(/\r?\n/).length;
    results.push({ file: rel, lines });
    totalLines += lines;
  } catch (e) {}
}

results.sort((a, b) => b.lines - a.lines);

console.log('--- LINE COUNT PER FILE ---');
results.forEach(r => console.log(`${r.lines.toString().padStart(6)} lines : ${r.file}`));
console.log('---------------------------');
console.log(`TOTAL LINES OF CODE: ${totalLines}`);
