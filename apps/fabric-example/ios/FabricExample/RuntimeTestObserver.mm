#if RUNTIME_TESTS

#import <React/RCTBackedTextInputViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTViewComponentView.h>
#import <RuntimeTestObserverSpec/RuntimeTestObserverSpec.h>
#import <react/renderer/components/rnscreens/EventEmitters.h>
#import <react/renderer/mounting/ShadowTree.h>
#import <react/renderer/uimanager/UIManager.h>
#include <vector>

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
    resolve(view.window != nil && view.superview != nil ? @(view.superview.tag) : (id)kCFNull);
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
    resolve(@{@"translateX" : @(layer.transform.m41), @"width" : @(layer.bounds.size.width)});
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
