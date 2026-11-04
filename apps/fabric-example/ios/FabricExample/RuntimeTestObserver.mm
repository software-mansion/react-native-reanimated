#if RUNTIME_TESTS

#import <React/RCTBackedTextInputViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTViewComponentView.h>
#import <RuntimeTestObserverSpec/RuntimeTestObserverSpec.h>
#import <objc/runtime.h>
#import <react/renderer/components/rnscreens/EventEmitters.h>
#import <react/renderer/mounting/ShadowTree.h>
#import <react/renderer/uimanager/UIManager.h>
#include <vector>

static NSMutableArray<NSDictionary *> *recordedUnmounts;

// Use only for a class that implements the method itself. Otherwise the call changes the
// method of its superclass.
static void recordUnmountsOf(Class viewClass)
{
  SEL selector = @selector(unmountChildComponentView:index:);
  Method method = class_getInstanceMethod(viewClass, selector);
  auto original = (void (*)(UIView *, SEL, UIView *, NSInteger))method_getImplementation(method);
  method_setImplementation(method, imp_implementationWithBlock(^(UIView *parent, UIView *child, NSInteger index) {
                             [recordedUnmounts addObject:@{@"parentTag" : @(parent.tag), @"childTag" : @(child.tag)}];
                             original(parent, selector, child, index);
                           }));
}

@interface RuntimeTestObserver : NSObject <NativeRuntimeTestObserverSpec>
@property (nonatomic, weak) RCTSurfacePresenter *surfacePresenter;
- (std::shared_ptr<const facebook::react::RNSScreenEventEmitter>)screenEventEmitter:(NSInteger)tag;
@end

@implementation RuntimeTestObserver

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (void)emitScreenTransitionProgress:(NSInteger)tag
                            progress:(double)progress
                             closing:(BOOL)closing
                        goingForward:(BOOL)goingForward
                             resolve:(RCTPromiseResolveBlock)resolve
                              reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    auto emitter = [self screenEventEmitter:tag];
    if (!emitter) {
      reject(@"E_SCREEN", @"No mounted Screen for this tag", nil);
      return;
    }
    emitter->onTransitionProgress(facebook::react::RNSScreenEventEmitter::OnTransitionProgress{
        .progress = progress, .closing = closing ? 1 : 0, .goingForward = goingForward ? 1 : 0});
    resolve(nil);
  });
}

- (void)emitScreenGestureCancel:(NSInteger)tag
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    auto emitter = [self screenEventEmitter:tag];
    if (!emitter) {
      reject(@"E_SCREEN", @"No mounted Screen for this tag", nil);
      return;
    }
    emitter->onGestureCancel(facebook::react::RNSScreenEventEmitter::OnGestureCancel{});
    resolve(nil);
  });
}

- (void)observeParent:(NSInteger)tag resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIView *view = [self.surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
    resolve(view.window != nil && view.superview.tag > 0 ? @(view.superview.tag) : (id)kCFNull);
  });
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
    resolve(@{@"width" : @(layer.bounds.size.width), @"translateX" : @(layer.transform.m41)});
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
      @"labelSetterCalls" : (id)kCFNull,
    });
  });
}

- (void)startUnmountRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
      recordUnmountsOf([RCTViewComponentView class]);
      // React Native Screens takes the snapshot of a removed screen in this override.
      recordUnmountsOf(NSClassFromString(@"RNSScreenStackView"));
    });
    recordedUnmounts = [NSMutableArray new];
    resolve(nil);
  });
}

- (void)takeUnmountRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    resolve(recordedUnmounts ?: @[]);
    recordedUnmounts = nil;
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeRuntimeTestObserverSpecJSI>(params);
}

- (std::shared_ptr<const facebook::react::RNSScreenEventEmitter>)screenEventEmitter:(NSInteger)tag
{
  UIView *view = [self.surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
  RCTScheduler *scheduler = self.surfacePresenter.scheduler;
  if (view.window == nil || scheduler == nil) {
    return {};
  }
  auto uiManager = scheduler.uiManager;
  if (!uiManager) {
    return {};
  }
  std::shared_ptr<const facebook::react::RNSScreenEventEmitter> emitter;
  uiManager->getShadowTreeRegistry().enumerate([&](const facebook::react::ShadowTree &tree, bool &stop) {
    std::vector<std::shared_ptr<const facebook::react::ShadowNode>> pending{tree.getCurrentRevision().rootShadowNode};
    while (!pending.empty()) {
      auto node = std::move(pending.back());
      pending.pop_back();
      if (node->getTag() == tag) {
        emitter = std::dynamic_pointer_cast<const facebook::react::RNSScreenEventEmitter>(node->getEventEmitter());
        stop = true;
        return;
      }
      const auto &children = node->getChildren();
      pending.insert(pending.end(), children.begin(), children.end());
    }
  });
  return emitter;
}

@end

#endif
