fs = require('fs');

function patchFile(path, find, replace) {
  fs.readFile(path, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    data = data.replace(find, replace);

    fs.writeFile(path, data, function (err) {
      if (err) {
        return console.log(err);
      }
    });
  });
}

patchFile(
  'app/android/app/build.gradle',
  'enableHermes: true,',
  'enableHermes: false,'
);

const mainApplicationPath =
  'app/android/app/src/main/java/com/app/MainApplication.java';

patchFile(
  mainApplicationPath,
  'import java.util.List;',
  `import java.util.List;
  import com.facebook.react.bridge.JavaScriptExecutorFactory;
  import com.facebook.react.modules.systeminfo.AndroidInfoHelpers;
  import io.csie.kudo.reactnative.v8.executor.V8ExecutorFactory;
  `
);

patchFile(
  mainApplicationPath,
  'protected String getJSMainModuleName() {',
  `protected JavaScriptExecutorFactory getJavaScriptExecutorFactory() {
    return new V8ExecutorFactory(
        getApplicationContext(),
        getPackageName(),
        AndroidInfoHelpers.getFriendlyDeviceName(),
        getUseDeveloperSupport());
  }
  
  @Override
  protected String getJSMainModuleName() {`
);

patchFile(
  mainApplicationPath,
  'android {',
  `android {
    packagingOptions {
      // Make sure libjsc.so does not packed in APK
      exclude "**/libjsc.so"
    }
  `
);
