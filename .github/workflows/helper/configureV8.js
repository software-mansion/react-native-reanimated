fs = require('fs');

const buildGradlePath =
  '../../../../../app/node_modules/react-native-reanimated/android/app/build.gradle';
const mainApplicationPath =
  '../../../../../app/node_modules/react-native-reanimated/android/app/src/main/java/com/app/MainApplication.java';

fs.readFile(buildGradlePath, 'utf8', function (err, data) {
  console.log(__dirname);
  console.log(path.dirname(__filename));
  if (err) {
    return console.log(err);
  }
  console.log(data);
});

fs.readFile(mainApplicationPath, 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  console.log(data);
});
