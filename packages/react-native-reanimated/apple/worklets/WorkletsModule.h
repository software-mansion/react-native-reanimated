#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <worklets/NativeModules/NativeWorkletsModule.h>

@interface WorkletsModule : RCTEventEmitter <RCTBridgeModule>

- (std::shared_ptr<worklets::NativeWorkletsModule>)getNativeWorkletsModule;

@end
