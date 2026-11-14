import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit

class SceneDelegate: RCTDefaultReactNativeFactoryDelegate, UIWindowSceneDelegate {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?
  private var processReporter: ProcessReporter?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }

    BenchmarkSampler.shared.prepare(for: windowScene, arguments: UserDefaults.standard)
    processReporter = ProcessReporter(screen: windowScene.screen)
    processReporter?.start()
    dependencyProvider = RCTAppDependencyProvider()
    reactNativeFactory = RCTReactNativeFactory(delegate: self)
    window = UIWindow(windowScene: windowScene)
    reactNativeFactory?.startReactNative(
      withModuleName: "ReanimatedBenchmark",
      in: window,
      initialProperties: launchProperties(),
      launchOptions: nil
    )
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  private func launchProperties() -> [AnyHashable: Any] {
    let arguments = UserDefaults.standard
    var properties: [AnyHashable: Any] = [:]
    if let scenario = arguments.string(forKey: "benchmarkScenario") {
      properties["scenario"] = scenario
    }
    if arguments.object(forKey: "benchmarkLoad") != nil {
      properties["load"] = arguments.integer(forKey: "benchmarkLoad")
    }
    return properties
  }
}
