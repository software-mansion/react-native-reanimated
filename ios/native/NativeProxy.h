//
//  NativeProxy.h
//  DoubleConversion
//
//  Created by Szymon Kapala on 27/02/2020.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface NativeProxy : NSObject

std::shared_ptr<NativeReanimatedModule> nativeReanimatedModule;
std::shared_ptr<IOSScheduler> scheduler;

+ (void)clear();
+ (void)setUIManager:(RCTUIManager *)uiManager;

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterRender;
+ (NSArray<NSArray*>*) getChangedSharedValuesAfterEvent:(NSString *)eventName event:(id<RCTEvent>)event;

+ (BOOL)shouldEventBeHijacked:(NSString*)eventName;
+ (BOOL)anyRenderApplier;

+ (std::shared_ptr<NativeReanimatedModule>) getNativeReanimatedModule: jsInvoker: (std::shared_ptr<JSCallInvoker>)jsInvoker;

@end

// cpp

class NativeProxyWrapper {
public:
  static std::shared_ptr<NativeReanimatedModule> createNativeReanimatedModule(std::shared_ptr<JSCallInvoker> jsInvoker) {
    return [NativeProxy getNativeReanimatedModule:jsInvoker];
  }
}

NS_ASSUME_NONNULL_END
