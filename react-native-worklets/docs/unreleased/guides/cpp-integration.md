# Integrating with Worklets from C++

Use the Worklets stable C++ interface when your React Native library needs to call Worklets from native code. Declare `react-native-worklets` as a peer dependency with a package range you have tested. The app installs Worklets and React Native autolinks it.

## iOS

### CocoaPods

Add Worklets as a dependency of your library's pod. For a source-built CocoaPods integration, add the Worklets public header directory to your pod target's existing header search paths.

```ruby
s.dependency 'RNWorklets'
s.pod_target_xcconfig = {
  'HEADER_SEARCH_PATHS' => '$(inherited) "$(PODS_ROOT)/Headers/Public/RNWorklets"',
  'OTHER_CPLUSPLUSFLAGS' => '$(inherited) -DWORKLETS_STABLE_API_TARGET=\"0.14.0\"'
}
```

### Swift Package Manager

In your library's `Package.swift`, add the local `RNWorklets` package and depend on its product from your native target. The example assumes React Native's Swift Package Manager autolinking places your package and `RNWorklets` next to each other.

```swift
let package = Package(
    name: "MyLibrary",
    platforms: [.iOS(.v15)],
    dependencies: [
        .package(name: "RNWorklets", path: "../RNWorklets"),
    ],
    targets: [
        .target(
            name: "MyLibrary",
            dependencies: [.product(name: "RNWorklets", package: "RNWorklets")],
            cSettings: [.define("WORKLETS_STABLE_API_TARGET", to: "\"0.14.0\"")],
            cxxSettings: [.define("WORKLETS_STABLE_API_TARGET", to: "\"0.14.0\"")]
        ),
    ],
    cxxLanguageStandard: .cxx20
)
```

## Android

Enable Prefab and add the autolinked Worklets Gradle project as a dependency.

```kotlin
android {
    buildFeatures {
        prefab = true
    }
}

dependencies {
    implementation(project(":react-native-worklets"))
}
```

In your library's `CMakeLists.txt`, link the Worklets Prefab target. Replace `my_library` with your CMake target.

```cmake
find_package(react-native-worklets REQUIRED CONFIG)
target_link_libraries(my_library PRIVATE react-native-worklets::worklets)
target_compile_definitions(my_library PRIVATE "WORKLETS_STABLE_API_TARGET=\"0.14.0\"")
```

## Set a C++ target version

Include the stable Worklets header in your native source.

```cpp
#include <worklets/Compat/StableApi.h>
```

Set `WORKLETS_STABLE_API_TARGET` in the build settings of every native target that includes this header. Use a SemVer string in `major.minor.patch` form, such as `"0.14.0"`. Build settings also pass the target to CocoaPods builds that compile the header as a Clang module.

You can still include the header and use functions whose versions are at or below your target.
