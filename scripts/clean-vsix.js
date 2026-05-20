const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const packageFilePath = path.join(workspaceRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageFilePath, 'utf8'));
const expectedPackageName = `${packageJson.name}-${packageJson.version}.vsix`;

for (const entry of fs.readdirSync(workspaceRoot)) {
  if (!entry.endsWith('.vsix')) {
    continue;
  }

  if (entry === expectedPackageName) {
    continue;
  }

  fs.rmSync(path.join(workspaceRoot, entry), { force: true });
  console.log(`Removed old VSIX: ${entry}`);
}