import fs from 'fs';
import path from 'path';

const packages = [
  'apps/agent',
  'packages/schemas',
  'packages/config',
  'packages/db',
  'packages/ai',
  'packages/skills',
  'packages/scheduling',
  'packages/ui'
];

for (const pkg of packages) {
  const p = path.join(pkg, 'package.json');
  if (fs.existsSync(p)) {
    const pkgJson = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (pkgJson.scripts && pkgJson.scripts.test === 'vitest run') {
      pkgJson.scripts.test = 'vitest run --passWithNoTests';
      fs.writeFileSync(p, JSON.stringify(pkgJson, null, 2));
    }
  }
}
