## Patches for Bundle Mode

To use Bundle Mode in `react-native-worklets` you need to apply several patches. Bundle Mode uses a bunch of APIs which aren't yet exposed in React Native. Please give a thumbs up in the [pull request](https://github.com/facebook/react-native/pull/50788) to help us get them merged into React Native.

## What to patch

- `react-native` - to expose the APIs needed for Bundle Mode.
- `@react-native/community-cli-plugin` - to fix overridding of some Metro config options. See the [pull request](https://github.com/facebook/react-native/pull/50783).
- `metro` - to improve the user experience with bundling with Bundle Mode - this is a temporary workaround.
- `metro-runtime` - to improve the user experience with hot reloading with Bundle Mode - this is a temporary workaround.

## Patching instructions

Based on your package manager you should either use patches from `yarn` directory or `patch-package` directory.

## Using Yarn Modern (Yarn 2+)

Yarn Modern has a builtin patching functionality. Unfortunately, it cannot auto-apply a patch from a patch file conveniently. The best way to apply patches from this repo using it is:

1. Trigger the patch creation:

```terminal
yarn patch react-native
```

2. Following the instructions provided by Yarn change anything in the patched package.
3. Following the instructions provided by Yarn generate a patch and necessary resolutions based on your changes.
4. Replace the generated patch contents with the contents of the respective patch file.
5. Run `yarn install` to re-apply the patch.
6. Follow these steps for `@react-native/community-cli-plugin`, `metro` and `metro-runtime` as well.

## Using npm and patch-package

Using npm and patch-package is a lot more problematic in patching transitive dependencies. For best effect you should firstly clear your npm cache and dedupe current dependencies. Skipping this step is very likely to lead in massive dependency duplication and the applied patches not picked up correctly.

1. Clear the npm cache and dedupe dependencies:

```terminal
npm cache clean --force
npm dedupe
```

2. Install `patch-package`:

```terminal
npm install patch-package --save-dev
```

3. Create `patches` directory in the root of your project.
4. If you're not certain which versions of patches you need to apply, you can run `npm why` to find out which versions of packages you have. For example, to find out which version of `metro` you have, run:

```terminal
npm why metro
```

5. Copy the patch files for `metro`, `metro-runtime`, `react-native` and `@react-native/community-cli-plugin` to the `patches` directory.
6. Run `patch-package` to apply the patches:

```terminal
npx patch-package
```

## Using Yarn Classic (Yarn 1) and patch-package

Instructions here are similar to the npm ones, but you should use Yarn commands instead, i.e. `yarn cache clean` and `yarn dedupe`.

## Contributions

If you're using a different package manager than the ones listed above or if you want to use a different version of React Native, feel free to contribute to this repository!
