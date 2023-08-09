fs = require('fs');

function patchFile(path, find, replace) {
  let data = fs.readFileSync(path, 'utf8');
  data = data.replace(find, replace);
  fs.writeFileSync(path, data);
}

const command = process.argv[2];

if (command === 'setBundleIdentifier') {
  patchFile(
    'app/app.json',
    '"ios": {',
    '"ios": {"bundleIdentifier":"com.swmansion.app",'
  );

  patchFile(
    'app/app.json',
    '"android": {',
    '"android": {"package": "com.swmansion.app",'
  );
}

if (command === 'setupFabricIOS') {
  patchFile(
    'app/ios/Podfile.properties.json',
    '"expo.jsEngine"',
    '"newArchEnabled":"true","expo.jsEngine"'
  );
}

if (command === 'setupFabricAndroid') {
  patchFile(
    'app/android/gradle.properties',
    'newArchEnabled=false',
    'newArchEnabled=true'
  );
}
