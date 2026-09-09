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

// NSNumber needs the CFBoolean check to tell booleans apart from integers.
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

func isConsumerPackageJSON(at url: URL) -> Bool {
    guard let json = readJSONObject(at: url),
        let name = json["name"] as? String,
        name != "react-native-worklets",
        let section = json["worklets"] as? [String: Any],
        section["staticFeatureFlags"] != nil
    else {
        return false
    }
    return true
}

// SPM autolinking uses ios/build/generated/autolinking/libs/<SwiftName>/ (symlink).
func findConsumerPackageJSON() -> URL? {
    var dir = URL(fileURLWithPath: packageDirectory).standardizedFileURL
    while dir.path != "/" {
        let candidate = dir.appendingPathComponent("package.json")
        if isConsumerPackageJSON(at: candidate) {
            return candidate
        }
        dir = dir.deletingLastPathComponent()
    }
    return nil
}

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
        let section = consumer["worklets"] as? [String: Any],
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
let featureFlags = formatFeatureFlags(readStaticFeatureFlags())

let reactHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
    .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
]

let package = Package(
    name: "RNWorklets",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "RNWorklets", targets: ["RNWorklets"]),
    ],
    dependencies: [
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(name: "React-GeneratedCode", path: "../../../ios"),
    ],
    targets: [
        .target(
            name: "RNWorklets",
            dependencies: reactHeaders,
            path: ".",
            sources: ["Common/cpp/worklets", "apple/worklets"],
            publicHeadersPath: "Common/cpp",
            cSettings: [
                .headerSearchPath("."),
                .headerSearchPath("Common/cpp"),
                .headerSearchPath("apple"),
                .define("WORKLETS_VERSION", to: version),
                .define("WORKLETS_FEATURE_FLAGS", to: featureFlags),
                .define("HERMES_ENABLE_DEBUGGER", to: "1", .when(configuration: .debug)),
            ],
            cxxSettings: [
                .headerSearchPath("."),
                .headerSearchPath("Common/cpp"),
                .headerSearchPath("apple"),
                .define("WORKLETS_VERSION", to: version),
                .define("WORKLETS_FEATURE_FLAGS", to: featureFlags),
                .define("HERMES_ENABLE_DEBUGGER", to: "1", .when(configuration: .debug)),
                .define("DEBUG", .when(configuration: .debug)),
                .define("NDEBUG", .when(configuration: .release)),
            ],
            linkerSettings: [
                .linkedFramework("UIKit"),
                .linkedFramework("Foundation"),
                .linkedFramework("QuartzCore"),
            ]
        ),
    ],
    cxxLanguageStandard: .cxx20
)
