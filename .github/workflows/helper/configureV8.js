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
        exclude "**/libjsc.so"
    }`
);

const mainApplicationPath =
  'app/android/app/src/main/java/com/app/MainApplication.kt';

patchFile(
  mainApplicationPath,
  'import com.facebook.soloader.SoLoader',
  `import com.facebook.soloader.SoLoader
import com.facebook.react.bridge.JavaScriptExecutorFactory
import com.facebook.react.modules.systeminfo.AndroidInfoHelpers
import io.csie.kudo.reactnative.v8.executor.V8ExecutorFactory`
);

patchFile(
  mainApplicationPath,
  'override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED',
  `override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED

        override fun getJavaScriptExecutorFactory(): JavaScriptExecutorFactory =
            V8ExecutorFactory(
              applicationContext,
              packageName,
              AndroidInfoHelpers.getFriendlyDeviceName(),
              useDeveloperSupport
            )`
);
