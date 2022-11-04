fs = require('fs');

const buildGradlePath = 'app/android/app/build.gradle';
const mainApplicationPath =
  'app/android/app/src/main/java/com/app/MainApplication.java';

fs.readFile(buildGradlePath, 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  data = data.replace('enableHermes: true,', 'enableHermes: false,');

  fs.writeFile(buildGradlePath, data, function (err) {
    if (err) {
      return console.log(err);
    }
  });
});

fs.readFile(mainApplicationPath, 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  const imports = `
  import java.util.List;
  import com.facebook.react.bridge.JavaScriptExecutorFactory;
  import com.facebook.react.modules.systeminfo.AndroidInfoHelpers;
  import io.csie.kudo.reactnative.v8.executor.V8ExecutorFactory;
  `;
  data = data.replace('import java.util.List;', imports);

  const getJSMainModuleName = 'protected String getJSMainModuleName() {';
  const getJavaScriptExecutorFactory = `
  protected JavaScriptExecutorFactory getJavaScriptExecutorFactory() {
    return new V8ExecutorFactory(
        getApplicationContext(),
        getPackageName(),
        AndroidInfoHelpers.getFriendlyDeviceName(),
        getUseDeveloperSupport());
  }
  
  @Override
  protected String getJSMainModuleName() {`;
  data = data.replace(getJSMainModuleName, getJavaScriptExecutorFactory);

  const packagingOptions = `
  android {
    packagingOptions {
      // Make sure libjsc.so does not packed in APK
      exclude "**/libjsc.so"
    }
  `;
  data = data.replace('android {', packagingOptions);

  fs.writeFile(mainApplicationPath, data, function (err) {
    if (err) {
      return console.log(err);
    }
  });
});
