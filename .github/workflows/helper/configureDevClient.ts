import fs from 'node:fs';
import path from 'node:path';

function patchFile(filePath: string, find: string, replace: string): void {
  let data = fs.readFileSync(filePath, 'utf8');

  if (!data.includes(find)) {
    if (data.includes(replace)) {
      return;
    }

    throw new Error(`Could not find the expected contents in ${filePath}`);
  }

  data = data.replace(find, replace);
  fs.writeFileSync(filePath, data);
}

function patchExpoModulesCore(): void {
  const iosSourcePath = 'ios/WorkletsAdapter/ExpoWorkletsBridgeProvider.mm';
  const androidSourcePath =
    'android/src/main/cpp/worklets/WorkletJSCallInvoker.cpp';
  const candidates = [
    'node_modules/expo/node_modules/expo-modules-core',
    'node_modules/expo-modules-core',
  ];
  const packagePaths = [
    ...new Set(
      candidates
        .filter(
          (candidate) =>
            fs.existsSync(path.join(candidate, iosSourcePath)) &&
            fs.existsSync(path.join(candidate, androidSourcePath))
        )
        .map((candidate) => fs.realpathSync(candidate))
    ),
  ];

  if (packagePaths.length === 0) {
    throw new Error('Could not find the installed expo-modules-core package');
  }

  for (const packagePath of packagePaths) {
    patchFile(
      path.join(packagePath, iosSourcePath),
      'workletRuntime->executeSync([worklet, arguments]',
      'workletRuntime->runSync([worklet, arguments]'
    );

    patchFile(
      path.join(packagePath, androidSourcePath),
      `workletRuntime->executeSync([func = std::move(func)](jsi::Runtime &rt) -> jsi::Value {
      func(rt);
      return jsi::Value::undefined();
    });`,
      'workletRuntime->runSync(func);'
    );

    const podspecPath = path.join(
      packagePath,
      'ExpoModulesWorkletsAdapter.podspec'
    );
    if (
      !fs
        .readFileSync(podspecPath, 'utf8')
        .includes('WORKLETS_STABLE_API_TARGET')
    ) {
      patchFile(
        podspecPath,
        `  s.source_files = 'ios/WorkletsAdapter/**/*.{h,m,mm}'`,
        `  s.compiler_flags = '-DWORKLETS_STABLE_API_TARGET=\\"0.14.0\\"'

  s.source_files = 'ios/WorkletsAdapter/**/*.{h,m,mm}'`
      );
    }

    const cmakePath = path.join(packagePath, 'android/cmake/worklets.cmake');
    if (
      !fs.readFileSync(cmakePath, 'utf8').includes('WORKLETS_STABLE_API_TARGET')
    ) {
      patchFile(
        cmakePath,
        `  "\${REACT_NATIVE_WORKLETS_DIR}/android/src/main/cpp"
)
`,
        `  "\${REACT_NATIVE_WORKLETS_DIR}/android/src/main/cpp"
)

target_compile_definitions(
  expo-modules-worklets
  PRIVATE
  "WORKLETS_STABLE_API_TARGET=\\"0.14.0\\""
)
`
      );
    }
  }
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

if (command === 'patchExpoModulesCore') {
  patchExpoModulesCore();
}
