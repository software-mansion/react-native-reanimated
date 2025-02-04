---
id: building-on-windows
title: Building for Android on Windows
sidebar_label: Building for Android on Windows
---

This article provides basic troubleshooting steps for issues that may happen when building React Native apps with Reanimated for Android devices on Windows host machine.

There are many possible errors including, but not limited to:

- `Execution failed for task ':react-native-reanimated:buildCMakeDebug[x86_64]`
- `Execution failed for task ':react-native-reanimated:buildCMakeRelWithDebInfo[arm64-v8a]'`
- `Task :react-native-reanimated:buildCMakeDebug[x86_64] FAILED`
- `C/C++: ninja: error: mkdir(...): No such file or directory`
- `C++ build system [build] failed while executing`

## What should you definitely not do?

If you stumble across any of the above errors or similar, please don't disable or downgrade any features or dependencies. Here are some of examples of what **not** to do:

### ❌ Do not disable New Architecture if it's already enabled

Starting from React Native 0.76, New Architecture is enabled by default and the legacy architecture will be removed in a future release of React Native. Disabling it manually by changing `newArchEnabled=...` in `gradle.properties` does not fix the problem, it just postpones it.

### ❌ Do not downgrade Android Gradle Plugin

It is not recommended to change the version of Android Gradle Plugin (AGP) by modifying `distributionUrl=...` in `gradle.properties`. You should use the version of AGP used in the official app template. Changing the AGP version will lead to other problems, including version conflicts and unsupported features.

### ❌ Do not downgrade Reanimated or any other dependency

Downgrading the dependencies increases the technical debt of your project. Newer version of Reanimated contain various bug fixes and are more stable than previous releases. You should always try to use the latest supported version of Reanimated in your app. In fact, you should try upgrading all the dependencies to the latest available rather than downgrading them.

### ❌ Do not post another "same issue" comment

Before you report an error, search for similar issues on GitHub, Stack Overflow, Google, etc. Instead posting another "same issue" comment which will be marked as spam, just add a reaction under the original issue. This way we know how many developers are affected which lets us prioritize our work.

## What should you do then?

### ✅ Make sure your environment is set up correctly

First all, make sure that you have followed all instructions in [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment). Run `npx react-native doctor` to see if there are any problems. Make sure to open a new terminal, restart Visual Studio Code or your IDE, or even reboot your computer if changes have been applied.

### ✅ Use appropriate version of Reanimated

Make sure to use latest supported version of Reanimated, depending on the setup of your app.

**If your app uses Expo SDK**, you must use a specific major and minor version of Reanimated (first and second number). For instance, Expo SDK 52 supports only Reanimated 3.16.x. Make sure to update to the latest available patch version (third number), for instance 3.16.7.

| Expo SDK version | Reanimated version |
| :--------------: | :----------------: |
|       `52`       |     `~3.16.1`      |
|       `51`       |     `~3.10.1`      |
|       `50`       |      `~3.6.2`      |

:::tip
How to determine which version is compatible? Open https://github.com/expo/expo/blob/sdk-52/packages/expo/bundledNativeModules.json file, jump to `sdk-XX` branch and search for `"react-native-reanimated"`.
:::

**If your project uses Expo prebuild or React Native without a framework (e.g. React Native Community CLI)**, you should use a version of Reanimated that is compatible with the version of React Native according to the [Compatibility table](/docs/guides/compatibility).

For instance, Reanimated 3.15.x works only with React Native 0.72, 0.73, 0.74 or 0.75 and **is not** compatible with React Native 0.76. If you want to use Reanimated with React Native 0.76, you need to upgrade to at least 3.16.0. It is recommended to use the latest available version (in this case, 3.16.7).

### ✅ Use appropriate version of CMake

[CMake](https://cmake.org/) is a build system used to compile the C++ part of Reanimated on your machine. Make sure to use CMake `3.22.1` or newer. CMake version can be customized with `CMAKE_VERSION` environmental variable, e.g. using `set CMAKE_VERSION=3.31.1`. If not set, CMake `3.22.1` is used.

:::tip
CMake will be installed automatically during app build. You can install a specific version CMake directly from Android Studio (Tools &rarr; SDK Manager &rarr; SDK Tools &rarr; CMake).
:::

### ✅ Use appropriate version of Ninja

[Ninja](https://ninja-build.org/) is a build system used to compile the C++ part of Reanimated on your machine. Make sure to use Ninja `1.12.0` or newer (current latest is `1.12.1`) as some older versions of Ninja do not handle long paths correctly (see [this issue on GitHub](https://github.com/ninja-build/ninja/issues/1900)).

:::tip
See [this comment on GitHub](https://github.com/ninja-build/ninja/issues/1900#issuecomment-1817532728) for instructions on how to use a different version of Ninja.
:::

### ✅ Enable long paths support in Windows registry

See [this page](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation?tabs=registry#enable-long-paths-in-windows-10-version-1607-and-later) for instructions on how to enable support for long paths on Windows.

### ✅ Make sure that project path doesn't contain any whitespace

The build process may not work properly for paths with space characters. Spaces often appear in usernames, for example `C:\Users\Szczepan Czekan`, or project names, for instance `D:\Mobile Apps\My Awesome Project`. In such case, move the project to another directory that does not contain whitespace.

### ✅ Make sure that project path is not too long

The build process may not work properly for paths that are too long. Actually, CMake will raise a warning when it comes across a path longer than 240 characters. In such case, move the project or clone the repository again to a location with shorter path, for example `D:\AwesomeProject`.

:::tip
On Windows, you can mount a specific directory (e.g. `C:\Users\Tomek\AwesomeProject`) as a drive (e.g. `H:`) using the following command: `subst H: C:\Users\Tomek\AwesomeProject`
:::

### ✅ Remove or invalidate caches

During app build, multiple compilation artifacts are saved in various paths, for instance:

- `android\build`
- `android\.cxx`
- `android\.gradle`
- `android\app\build`
- `android\app\.cxx`
- `node_modules\react-native-reanimated\android\build`
- `node_modules\react-native-reanimated\android\.cxx`
- `C:\Users\Tomek\.gradle\caches`

Make sure to remove these directories and their contents before trying to build the app again.

It is also recommended to invalidate Android Studio caches (File &rarr; Invalidate Caches&hellip; &rarr; Select all checkboxes &rarr; Invalidate and Restart).

:::tip
You can remove all untracked files in your repository using `git clean -fdX` command. Note that this command will remove all untracked files including hidden files like `.env` so please be extra careful and proceed with caution when doing so. You will also need to reinstall `node_modules` afterwards using your chosen package manager and rebuild the app.
:::

### ⚠️ I have followed all of the above steps and it still doesn't work

If you still have problems with building for Android device on a Windows machine, please [submit an issue](https://github.com/software-mansion/react-native-reanimated/issues/new?template=bug-report.yml) in our repository. Make sure to provide full build logs and preferably a minimal viable reproducible example so we can replicate and investigate your issue.
