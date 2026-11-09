import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit

class SceneDelegate: RCTDefaultReactNativeFactoryDelegate, UIWindowSceneDelegate {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?
  let runtimeTestsLibrary: String? = {
    let library = ProcessInfo.processInfo.environment["RUNTIME_TESTS_LIBRARY"]
#if RUNTIME_TESTS
    return library ?? "reanimated"
#elseif DEBUG
    return library
#else
    return nil
#endif
  }()

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }

    dependencyProvider = RCTAppDependencyProvider()
    reactNativeFactory = RCTReactNativeFactory(delegate: self, releaseLevel: RCTReleaseLevel.Experimental)
    window = UIWindow(windowScene: windowScene)

#if DEBUG
    reactNativeFactory?.devMenuConfiguration = RCTDevMenuConfiguration(
      devMenuEnabled: true,
      shakeGestureEnabled: true,
      keyboardShortcutsEnabled: true
    )
#endif

    let initialProperties = ProcessInfo.processInfo.environment["RUNTIME_TESTS_WS_URL"]
      .map { ["wsUrl": $0] as [AnyHashable: Any] }
    reactNativeFactory?.startReactNative(
      withModuleName: runtimeTestsLibrary == nil ? "FabricExample" : "FabricExampleRuntimeTests",
      in: window,
      initialProperties: initialProperties,
      connectionOptions: connectionOptions
    )
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    RCTLinkingManager.scene(scene, openURLContexts: URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.scene(scene, continue: userActivity)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings()
      .jsBundleURL(forBundleRoot: runtimeTestsLibrary.map { "index.runtimeTests.\($0)" } ?? "index")
#else
    return Bundle.main.url(
      forResource: runtimeTestsLibrary.map { "main.runtimeTests.\($0)" } ?? "main", withExtension: "jsbundle")
#endif
  }
}
