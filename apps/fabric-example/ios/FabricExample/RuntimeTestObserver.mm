#if RUNTIME_TESTS

#import <React/RCTBackedTextInputViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTViewComponentView.h>
#import <RuntimeTestObserverSpec/RuntimeTestObserverSpec.h>

@interface RuntimeTestObserver : NSObject <NativeRuntimeTestObserverSpec>
@property (nonatomic, weak) RCTSurfacePresenter *surfacePresenter;
@end

@implementation RuntimeTestObserver

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (void)observeTransform:(NSInteger)tag resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIView *view = [self.surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
    if (view.window == nil) {
      resolve((id)kCFNull);
      return;
    }
    CALayer *layer = view.layer.presentationLayer ?: view.layer;
    resolve(@{@"translateX" : @(layer.transform.m41)});
  });
}

- (void)observeTextInput:(NSInteger)tag resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIView *view = [self.surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
    if (![view isKindOfClass:[RCTViewComponentView class]] || view.window == nil) {
      resolve((id)kCFNull);
      return;
    }
    NSObject *element = ((RCTViewComponentView *)view).accessibilityElement;
    if (![element conformsToProtocol:@protocol(RCTBackedTextInputViewProtocol)]) {
      resolve((id)kCFNull);
      return;
    }
    resolve(@{
      @"accessibilityLabel" : element.accessibilityLabel ?: (id)kCFNull,
      @"placeholderTextColor" : (id)kCFNull,
    });
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeRuntimeTestObserverSpecJSI>(params);
}

@end

#endif
