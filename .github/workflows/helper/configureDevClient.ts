import fs from 'node:fs';

function patchFile(path: string, find: string, replace: string): void {
  let data = fs.readFileSync(path, 'utf8');
  data = data.replace(find, replace);
  fs.writeFileSync(path, data);
}

const command = process.argv[2];

if (command === 'setBundleIdentifier') {
  patchFile(
    'app.json',
    '"ios": {',
    '"ios": {"bundleIdentifier":"com.swmansion.app",'
  );

  patchFile(
    'app.json',
    '"android": {',
    '"android": {"package": "com.swmansion.app",'
  );
}
