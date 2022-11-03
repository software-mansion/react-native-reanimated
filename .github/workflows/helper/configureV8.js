fs = require('fs');

const buildGradlePath = 'android/app/build.gradle';
const mainApplicationPath =
  'android/app/src/main/java/com/app/MainApplication.java';

fs.readFile(buildGradlePath, 'utf8', function (err, data) {
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
