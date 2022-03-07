#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import <React/RCTRootView.h>

#ifndef RCT_USE_HERMES
#if __has_include(<reacthermes/HermesExecutorFactory.h>)
#define RCT_USE_HERMES 1
#else
#define RCT_USE_HERMES 0
#endif
#endif

#if RCT_USE_HERMES
#import <reacthermes/HermesExecutorFactory.h>
#else
#import <React/JSCExecutorFactory.h>
#endif

#import <ReactCommon/RCTTurboModuleManager.h>

std::unique_ptr<facebook::react::JSExecutorFactory>
REAAppSetupDefaultJsExecutorFactory(
    RCTBridge *bridge,
    RCTTurboModuleManager *turboModuleManager);
