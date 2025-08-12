const fs = require('fs');
const path = require('path');

const compatibilityPath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'packages',
  'react-native-reanimated',
  'compatibility.json'
);
const compatibilityData = JSON.parse(
  fs.readFileSync(compatibilityPath, 'utf8')
);

const versions = compatibilityData['nightly']['react-native'];
const versionsJson = JSON.stringify(versions);

const versionsWithNightly = [...versions, 'nightly'];
const versionsWithNightlyJson = JSON.stringify(versionsWithNightly);

fs.writeFileSync(
  '/tmp/react-native-versions.json',
  'react-native-versions=' + versionsJson
);
fs.writeFileSync(
  '/tmp/react-native-versions-with-nightly.json',
  'react-native-versions-with-nightly=' + versionsWithNightlyJson
);
