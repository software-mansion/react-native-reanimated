#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <worklets/NativeModules/NativeWorkletsModule.h>

using namespace reanimated;

@interface WorkletsModule : RCTEventEmitter <RCTBridgeModule>

- (std::shared_ptr<NativeWorkletsModule>)getNativeWorkletsModule;

@end
