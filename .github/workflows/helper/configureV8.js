fs = require('fs');

const buildGradlePath = 'app/android/app/build.gradle';
const mainApplicationPath =
  'app/android/app/src/main/java/com/app/MainApplication.java';

const { exec } = require('child_process');

exec('ls -la', (error, stdout, stderr) => {
  if (error) {
    console.log(`error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.log(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});

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
