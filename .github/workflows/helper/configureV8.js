fs = require('fs');

function patchFile(path, find, replace) {
  let data = fs.readFileSync(path, 'utf8');
  data = data.replace(find, replace);
  fs.writeFileSync(path, data);
}

const buildGradle = 'app/android/app/build.gradle';

patchFile(buildGradle, 'enableHermes: true,', 'enableHermes: false,');

patchFile(
  buildGradle,
  'android {',
  `android {
    packagingOptions {
      // Make sure libjsc.so does not packed in APK
      exclude "**/libjsc.so"
    }
  `
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
