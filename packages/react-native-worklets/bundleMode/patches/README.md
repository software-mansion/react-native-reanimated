## Patches for Bundle Mode

To use Bundle Mode in `react-native-worklets` you need to apply several patches. Bundle Mode uses a bunch of APIs which aren't yet available in the React Native ecosystem.

## What to patch

- `metro` - allows for seamless bundling in Bundle Mode.
- `metro-runtime` - enables Fast Refresh support in Bundle Mode.

## Patching instructions

Based on your package manager you should either use patches from `yarn` directory or `patch-package` directory.

Find the version of `metro` and `metro-runtime` that are a closest match to the ones used in your project. You can find out which versions of packages you have by running `yarn why metro`, `npm why metro`, or `bun why metro --top`.

This versions don't have to match exactly as the patches are usually compatible with multiple versions of the packages.

## Using Yarn Modern (Yarn 2+)

Yarn Modern has a builtin patching functionality. Unfortunately, it cannot auto-apply a patch from a patch file conveniently. The best way to apply patches from this repo using it is:

1. Trigger the patch creation:
   ```terminal
   yarn patch metro
   ```
1. Following the instructions provided by Yarn change anything in the patched package.
1. Following the instructions provided by Yarn generate a patch and necessary resolutions based on your changes.
1. Replace the generated patch contents with the contents of the respective patch file.
1. Run `yarn install` to re-apply the patch.
1. Follow these steps for `metro-runtime` as well.

## Using npm and patch-package

Using npm and patch-package is a lot more problematic in patching transitive dependencies. For best effect you should firstly clear your npm cache and dedupe current dependencies. Skipping this step is very likely to lead in massive dependency duplication and the applied patches not picked up correctly.

1. Clear the npm cache and dedupe dependencies:
   ```terminal
   npm cache clean --force
   npm dedupe
   ```
1. Install `patch-package`:
   ```terminal
   npm install patch-package --save-dev
   ```
1. Create `patches` directory in the root of your project.
1. If you're not certain which versions of patches you need to apply, you can run `npm why` to find out which versions of packages you have. For example, to find out which version of `metro` you have, run:
   ```terminal
   npm why metro
   ```
1. Copy the patch files for `metro`, `metro-runtime` to the `patches` directory.
1. Run `patch-package` to apply the patches:
   ```terminal
   npx patch-package
   ```

## Using bun

Using bun for patching gives you the benefit of the bun runtime in your project (works with monorepos and `linker=isolated`). Bun's patching method generally works better in bun repos, and doesn't create any issues with transitive dependencies or the bun cache. (You should use the patches in the `patch-package` directory)

1. Create `patches` directory in the project root
1. If you're not certain which versions of patches you need to apply, you can run `bun why --top` to find out which versions of packages you have. For example, to find out which version of `metro` you have, run:
   ```terminal
   bun why metro --top
   ```
1. Run `bun patch` to prep packages:
   ```terminal
   bun patch metro
   ```
   AND
   ```terminal
   bun patch metro-runtime
   ```
1. Replace metro version with your version of patch:
   (Change the numbers at the end (0.84.4) to the version of your choice (e.g. 0.82.4)
   ```terminal
   curl -L https://github.com/software-mansion/react-native-reanimated/raw/main/packages/react-native-worklets/bundleMode/patches/patch-package/metro/metro%2B0.84.4.patch | git apply --directory=node_modules/metro
   ```
   AND
   ```terminal
   curl -L https://github.com/software-mansion/react-native-reanimated/raw/main/packages/react-native-worklets/bundleMode/patches/patch-package/metro-runtime/metro-runtime%2B0.84.4.patch | git apply --directory=node_modules/metro-runtime
   ```
1. Run `bun patch --commit` to commit patches to the repo:
   ```terminal
   bun patch --commit 'node_modules/metro'
   ```
   AND
   ```terminal
   bun patch --commit 'node_modules/metro-runtime'
   ```

## Using Yarn Classic (Yarn 1) and patch-package

Instructions here are similar to the npm ones, but you should use Yarn commands instead, i.e. `yarn cache clean` and `yarn dedupe`.

## Contributions

If you're using a different package manager than the ones listed above or if you want to use a different version of React Native, feel free to contribute patches and instructions!
