//
//  NativeProxy.h
//  DoubleConversion
//
//  Created by Szymon Kapala on 27/02/2020.
//

#import <Foundation/Foundation.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTUIManager.h>

#if __cplusplus
#import <RNReanimated/NativeReanimatedModule.h>
#endif

NS_ASSUME_NONNULL_BEGIN

@interface NativeProxy : NSObject

+ (void)clear;
+ (void)setUIManager:(RCTUIManager *)uiManager;

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterRender;
+ (NSArray<NSArray*>*) getChangedSharedValuesAfterEvent:(NSString *)eventName event:(id<RCTEvent>)event;

+ (BOOL)shouldEventBeHijacked:(NSString*)eventName;
+ (BOOL)anyRenderApplier;

+ (void*)getNativeReanimatedModule:(void*)jsInvokerVoidPtr;

@end

// cpp

#if __cplusplus

using namespace facebook;
using namespace react;

class NativeProxyWrapper {
public:
  static std::shared_ptr<NativeReanimatedModule> createNativeReanimatedModule(std::shared_ptr<JSCallInvoker> jsInvoker) {
    return *(static_cast<std::shared_ptr<NativeReanimatedModule> *>([NativeProxy getNativeReanimatedModule:(&jsInvoker)]));
  }
};

#endif

NS_ASSUME_NONNULL_END
