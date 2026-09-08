import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

main();

function main() {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const repositoryRoot = resolve(packageRoot, '../..');
  const podsDirectory =
    process.env.REANIMATED_TEST_PODS_DIR ??
    join(repositoryRoot, 'apps/fabric-example/ios/Pods');
  const dependencies = join(podsDirectory, 'ReactNativeDependencies');
  const framework = join(
    dependencies,
    'framework/packages/react-native/ReactNativeDependencies.xcframework/macos-arm64_x86_64'
  );
  const tests = join(packageRoot, '__tests__/native');
  const output = join(repositoryRoot, '.tmp/reanimated-native-tests');
  mkdirSync(output, { recursive: true });
  const executable = join(output, 'synchronousProps');

  run(process.env.CXX ?? 'clang++', [
    '-std=c++20',
    '-Wall',
    '-Wextra',
    '-Werror',
    `-I${join(tests, 'stubs')}`,
    `-I${join(packageRoot, 'Common/cpp')}`,
    `-I${join(dependencies, 'Headers')}`,
    `-F${framework}`,
    '-framework',
    'ReactNativeDependencies',
    `-Wl,-rpath,${framework}`,
    join(tests, 'synchronousProps.cpp'),
    join(
      packageRoot,
      'Common/cpp/reanimated/Fabric/updates/UpdatesRegistryManager.cpp'
    ),
    '-o',
    executable,
  ]);
  run(executable, []);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
