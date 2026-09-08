// swift-tools-version: 6.0

import Foundation
import PackageDescription

let packageDirectory = Context.packageDirectory

func readPackageVersion() -> String {
    let url = URL(fileURLWithPath: packageDirectory).appendingPathComponent("package.json")
    let data = try! Data(contentsOf: url)
    let json = try! JSONSerialization.jsonObject(with: data) as! [String: Any]
    return json["version"] as! String
}

func readJSONObject(at url: URL) -> [String: Any]? {
    guard let data = try? Data(contentsOf: url) else {
        return nil
    }
    let object = try? JSONSerialization.jsonObject(with: data)
    return object as? [String: Any]
}

// Mirror Ruby's `value.to_s`: booleans render as "true"/"false", numbers as
// their literal, strings pass through. NSNumber needs the CFBoolean check to
// tell booleans apart from integers.
func stringifyFlagValue(_ value: Any) -> String? {
    if let number = value as? NSNumber {
        if CFGetTypeID(number) == CFBooleanGetTypeID() {
            return number.boolValue ? "true" : "false"
        }
        return number.stringValue
    }
    if let string = value as? String {
        return string
    }
    return nil
}

// Locate the consuming app's package.json by walking out of `node_modules`,
// mirroring the CocoaPods `installation_root/../package.json` lookup. Returns
// nil in a source checkout (the package isn't installed under node_modules).
func findConsumerPackageJSON() -> URL? {
    guard let range = packageDirectory.range(of: "/node_modules/") else {
        return nil
    }
    let appRoot = String(packageDirectory[..<range.lowerBound])
    return URL(fileURLWithPath: appRoot).appendingPathComponent("package.json")
}

// Matches ReanimatedUtils.assert_conflicting_feature_flags so an invalid combo
// fails the SPM build the same way it fails `pod install`.
func assertNoConflictingFeatureFlags(_ flags: [String: String]) {
    if flags["IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS"] == "true",
        flags["ENABLE_SHARED_ELEMENT_TRANSITIONS"] == "true"
    {
        fatalError(
            "[Reanimated] The feature flags `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS` and `ENABLE_SHARED_ELEMENT_TRANSITIONS` cannot be enabled simultaneously. Please disable one of them in your package.json"
        )
    }

    if flags["USE_ANIMATION_BACKEND"] == "true",
        flags["FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS"] == "true"
    {
        fatalError(
            "[Reanimated] The feature flags `USE_ANIMATION_BACKEND` and `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` cannot be enabled simultaneously. If you want to use the animation backend, you need to explicitly disable `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` feature flag (enabled by default) in your package.json"
        )
    }
}

// Feature flags = library defaults from `src/featureFlags/staticFlags.json`,
// overlaid with per-app overrides from the consumer's
// `package.json` -> `reanimated.staticFeatureFlags` (same precedence as pods).
func readStaticFeatureFlags() -> [String: String] {
    var flags: [String: String] = [:]

    let defaultsURL = URL(fileURLWithPath: packageDirectory)
        .appendingPathComponent("src/featureFlags/staticFlags.json")
    if let defaults = readJSONObject(at: defaultsURL) {
        for (key, value) in defaults {
            if let stringValue = stringifyFlagValue(value) {
                flags[key] = stringValue
            }
        }
    }

    if let consumerURL = findConsumerPackageJSON(),
        let consumer = readJSONObject(at: consumerURL),
        let section = consumer["reanimated"] as? [String: Any],
        let overrides = section["staticFeatureFlags"] as? [String: Any]
    {
        for (key, value) in overrides {
            if let stringValue = stringifyFlagValue(value) {
                flags[key] = stringValue
            }
        }
    }

    return flags
}

func formatFeatureFlags(_ flags: [String: String]) -> String {
    return flags.keys.sorted().map { "[\($0):\(flags[$0]!)]" }.joined()
}

let version = readPackageVersion()
let staticFeatureFlags = readStaticFeatureFlags()
assertNoConflictingFeatureFlags(staticFeatureFlags)
let featureFlags = formatFeatureFlags(staticFeatureFlags)

let reactHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
    .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
]

let package = Package(
    name: "RNReanimated",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "RNReanimated", targets: ["RNReanimated"]),
    ],
    dependencies: [
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(name: "React-GeneratedCode", path: "../../../ios"),
        .package(name: "RNWorklets", path: "../RNWorklets"),
    ],
    targets: [
        .target(
            name: "RNReanimated",
            dependencies: reactHeaders + [
                .product(name: "RNWorklets", package: "RNWorklets"),
            ],
            path: ".",
            exclude: ["Common/NativeView/CMakeLists.txt"],
            sources: [
                "Common/cpp/reanimated",
                "apple/reanimated",
                "Common/NativeView",
            ],
            publicHeadersPath: "Common/cpp",
            cSettings: [
                .headerSearchPath("."),
                .headerSearchPath("Common/cpp"),
                .headerSearchPath("Common/NativeView"),
                .headerSearchPath("apple"),
                .define("REANIMATED_VERSION", to: version),
                .define("REANIMATED_FEATURE_FLAGS", to: featureFlags),
            ],
            cxxSettings: [
                .headerSearchPath("."),
                .headerSearchPath("Common/cpp"),
                .headerSearchPath("Common/NativeView"),
                .headerSearchPath("apple"),
                .define("REANIMATED_VERSION", to: version),
                .define("REANIMATED_FEATURE_FLAGS", to: featureFlags),
                .define("DEBUG", .when(configuration: .debug)),
                .define("NDEBUG", .when(configuration: .release)),
            ],
            linkerSettings: [
                .linkedFramework("UIKit"),
                .linkedFramework("Foundation"),
                .linkedFramework("QuartzCore"),
                .linkedFramework("CoreMotion"),
            ]
        ),
    ],
    cxxLanguageStandard: .cxx20
)
