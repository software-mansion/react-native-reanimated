#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/CoreModulesPlugins.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <REATurboCppModule.h>

@interface AppDelegate () <RCTTurboModuleManagerDelegate> {}
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"FabricExample";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}

- (BOOL)bridgelessEnabled
{
    return YES;
}

#pragma mark RCTTurboModuleManagerDelegate

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                      jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
  if (name == "REATurboCppModule") {
    return std::make_shared<facebook::react::REATurboCppModule>(jsInvoker);
  }
  return nullptr;
}

- (NSURL *)getBundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
