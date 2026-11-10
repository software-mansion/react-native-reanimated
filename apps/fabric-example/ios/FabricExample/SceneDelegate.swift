import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit

class SceneDelegate: RCTDefaultReactNativeFactoryDelegate, UIWindowSceneDelegate {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?

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

#if RUNTIME_TESTS
    let initialProperties = ProcessInfo.processInfo.environment["RUNTIME_TESTS_WS_URL"]
      .map { ["wsUrl": $0] as [AnyHashable: Any] }
    reactNativeFactory?.startReactNative(
      withModuleName: "FabricExampleRuntimeTests",
      in: window,
      initialProperties: initialProperties,
      connectionOptions: connectionOptions
    )
#else
    reactNativeFactory?.startReactNative(
      withModuleName: "FabricExample",
      in: window,
      connectionOptions: connectionOptions
    )
#endif
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    RCTLinkingManager.scene(scene, openURLContexts: URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.scene(scene, continue: userActivity)
  }

  override func bundleURL() -> URL? {
#if RUNTIME_TESTS
    let library =
      ProcessInfo.processInfo.environment["RUNTIME_TESTS_LIBRARY"] ?? "reanimated"
#if DEBUG
    return RCTBundleURLProvider.sharedSettings()
      .jsBundleURL(forBundleRoot: "index.runtimeTests.\(library)")
#else
    return Bundle.main.url(
      forResource: "main.runtimeTests.\(library)", withExtension: "jsbundle")
#endif
#elseif DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
