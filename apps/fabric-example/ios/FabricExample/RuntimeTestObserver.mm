#if DEBUG || RUNTIME_TESTS

#define WORKLETS_STABLE_API_TARGET "0.14.0"

#import <React/RCTBackedTextInputViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTViewComponentView.h>
#import <RuntimeTestObserverSpec/RuntimeTestObserverSpec.h>
#include <hermes/hermes.h>
#import <objc/runtime.h>
#import <react/renderer/components/rnscreens/EventEmitters.h>
#import <react/renderer/mounting/ShadowTree.h>
#import <react/renderer/uimanager/UIManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <worklets/apple/IOSUIScheduler.h>
#include <vector>

namespace {
// Observe the pending starts without replacing any of the proxy's implementation.
struct LayoutTransactionTestProxy : reanimated::LayoutAnimationsProxy {
  using LayoutAnimationsProxy::LayoutAnimationsProxy;
  using LayoutAnimationsProxyCommon::hasPendingLayoutAnimation;
};

NSDictionary *replayLayoutUpdateRemoval(bool removeParent)
{
  using namespace facebook::react;
  using namespace reanimated;
  // Run off the UI thread, like a mounting transaction whose animation starts
  // will be flushed on the next UI frame. No animation worklet is evaluated.
  auto runtime = facebook::hermes::makeHermesRuntime();
  auto manager = std::make_shared<LayoutAnimationsManager>();
  int flushRequests = 0;
  LayoutAnimationsProxyDependencies dependencies{
      .layoutAnimationsManager = manager,
      .contextContainer = std::make_shared<ContextContainer>(),
      .uiRuntime = *runtime,
      .uiScheduler = std::make_shared<worklets::IOSUIScheduler>(),
      .requestLayoutAnimationFlush = [&](SurfaceId) { flushRequests++; },
      .scheduleOnNextUIFrame = [](std::function<void()>) {},
      .readSynchronousOpacity = [](Tag) { return std::optional<double>{}; },
  };
  constexpr SurfaceId surface = 1;
  constexpr Tag parentTag = 2, childTag = 4, survivorTag = 6;
  auto proxy = std::make_shared<LayoutTransactionTestProxy>(surface, dependencies);
  proxy->initializeLightTree(ShadowTreeRevision{});
  const auto view = [](Tag tag) {
    ShadowView result;
    result.tag = tag;
    result.surfaceId = surface;
    result.componentName = "View";
    result.traits.set(ShadowNodeTraits::Trait::ViewKind);
    result.props = std::make_shared<ViewProps>();
    result.layoutMetrics.frame.size = {100, 20};
    return result;
  };
  const auto parent = view(parentTag);
  const auto child = view(childTag);
  const auto survivor = view(survivorTag);
  proxy->pullTransaction(
      surface,
      1,
      TransactionTelemetry{},
      {
          ShadowViewMutation::CreateMutation(parent),
          ShadowViewMutation::InsertMutation(surface, parent, 0),
          ShadowViewMutation::CreateMutation(child),
          ShadowViewMutation::InsertMutation(parentTag, child, 0),
          ShadowViewMutation::CreateMutation(survivor),
          ShadowViewMutation::InsertMutation(surface, survivor, 1),
      });
  manager->configureAnimationBatch({
      {.tag = childTag, .type = LayoutAnimationType::LAYOUT, .config = worklets::Serializable::undefined()},
      {.tag = survivorTag, .type = LayoutAnimationType::LAYOUT, .config = worklets::Serializable::undefined()},
  });
  auto updatedChild = child;
  updatedChild.layoutMetrics.frame.size.width = 200;
  auto updatedSurvivor = survivor;
  updatedSurvivor.layoutMetrics.frame.size.width = 200;
  ShadowViewMutationList mutations{
      ShadowViewMutation::UpdateMutation(child, updatedChild, parentTag),
      ShadowViewMutation::UpdateMutation(survivor, updatedSurvivor, surface),
  };
  if (removeParent) {
    mutations.insert(
        mutations.end(),
        {
            ShadowViewMutation::RemoveMutation(parentTag, updatedChild, 0),
            ShadowViewMutation::DeleteMutation(updatedChild),
            ShadowViewMutation::RemoveMutation(surface, parent, 0),
            ShadowViewMutation::DeleteMutation(parent),
        });
  }
  proxy->pullTransaction(surface, 2, TransactionTelemetry{}, std::move(mutations));
  return @{
    @"childMapped" : @(proxy->lightNodes_.contains(childTag)),
    @"childAnimationPending" : @(proxy->hasPendingLayoutAnimation(childTag)),
    @"survivorAnimationPending" : @(proxy->hasPendingLayoutAnimation(survivorTag)),
    @"flushRequests" : @(flushRequests),
  };
}
} // namespace

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

static BOOL isInContainerTransition(UIView *view)
{
  for (UIView *current = view; current; current = current.superview) {
    UIResponder *responder = current.nextResponder;
    if ([responder isKindOfClass:[UIViewController class]] && ((UIViewController *)responder).transitionCoordinator) {
      return YES;
    }
  }
  return NO;
}

static id presentedFrame(UIView *view)
{
  if (view.window == nil) {
    return (id)kCFNull;
  }
  CALayer *presentationLayer = view.layer.presentationLayer;
  CALayer *layer = presentationLayer ?: view.layer;
  CALayer *windowLayer = presentationLayer ? view.window.layer.presentationLayer : view.window.layer;
  const CGRect frame = [layer convertRect:layer.bounds toLayer:windowLayer];
  float opacity = 1;
  for (CALayer *current = layer; current; current = current.superlayer) {
    opacity *= current.hidden ? 0 : current.opacity;
  }
  return @{
    @"x" : @(frame.origin.x),
    @"y" : @(frame.origin.y),
    @"width" : @(frame.size.width),
    @"height" : @(frame.size.height),
    @"opacity" : @(opacity),
    @"inContainerTransition" : @(isInContainerTransition(view)),
  };
}

@interface FrameRecorder : NSObject
- (instancetype)initWithTags:(NSArray<NSNumber *> *)tags registry:(RCTComponentViewRegistry *)registry;
- (NSArray<NSArray *> *)stop;
@end

@implementation FrameRecorder {
  NSArray<NSNumber *> *_tags;
  __weak RCTComponentViewRegistry *_registry;
  NSMutableArray<NSArray *> *_samples;
  CADisplayLink *_displayLink;
}

- (instancetype)initWithTags:(NSArray<NSNumber *> *)tags registry:(RCTComponentViewRegistry *)registry
{
  if (self = [super init]) {
    _tags = tags;
    _registry = registry;
    _samples = [NSMutableArray new];
    _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(sample)];
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  }
  return self;
}

- (void)sample
{
  // A mount earlier in this frame shows in the presentation layers only after a Core Animation commit.
  [CATransaction flush];
  NSMutableArray *frames = [NSMutableArray arrayWithCapacity:_tags.count];
  for (NSNumber *tag in _tags) {
    [frames addObject:presentedFrame([_registry findComponentViewWithTag:tag.intValue])];
  }
  [_samples addObject:frames];
}

- (NSArray<NSArray *> *)stop
{
  [_displayLink invalidate];
  return _samples;
}

@end

static FrameRecorder *frameRecorder;

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

- (void)observeLocationOnScreen:(NSInteger)tag
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIView *view = [self.surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
    if (view.window == nil) {
      resolve((id)kCFNull);
      return;
    }
    const CGPoint anchor = view.layer.anchorPoint;
    const CGPoint untransformedOrigin = {
        view.center.x - view.bounds.size.width * anchor.x, view.center.y - view.bounds.size.height * anchor.y};
    const CGPoint origin = [view.superview convertPoint:untransformedOrigin toView:nil];
    resolve(@{@"x" : @(origin.x), @"y" : @(origin.y)});
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
    const CATransform3D t = layer.transform;
    resolve(@{
      @"width" : @(layer.bounds.size.width),
      @"translateX" : @(t.m41),
      @"matrix" : @[
        @(t.m11), @(t.m12), @(t.m13), @(t.m14), @(t.m21), @(t.m22), @(t.m23), @(t.m24),
        @(t.m31), @(t.m32), @(t.m33), @(t.m34), @(t.m41), @(t.m42), @(t.m43), @(t.m44)
      ]
    });
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

- (void)translateNativeParent:(NSInteger)tag
                            y:(double)y
                   presentedY:(double)presentedY
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIView *view = [self.surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
    UIView *nativeParent = view.superview;
    if (nativeParent == nil || nativeParent.tag > 0) {
      reject(@"E_PARENT", @"The mounted view has no native parent", nil);
      return;
    }
    NSString *key = @"presentedTranslation";
    [nativeParent.layer removeAnimationForKey:key];
    nativeParent.transform = CGAffineTransformMakeTranslation(0, y);
    if (presentedY != y) {
      CABasicAnimation *presented = [CABasicAnimation animationWithKeyPath:@"transform.translation.y"];
      presented.fromValue = @(presentedY);
      presented.toValue = @(presentedY);
      presented.duration = 3600;
      [nativeParent.layer addAnimation:presented forKey:key];
    }
    resolve(nil);
  });
}

- (void)startFrameRecording:(NSArray *)tags resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [frameRecorder stop];
    frameRecorder = [[FrameRecorder alloc] initWithTags:tags
                                               registry:self.surfacePresenter.mountingManager.componentViewRegistry];
    resolve(nil);
  });
}

- (void)takeFrameRecording:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    resolve([frameRecorder stop] ?: @[]);
    frameRecorder = nil;
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

- (void)pauseHost:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_PLATFORM", @"Host pause tests require Android", nil);
}

- (void)replayLayoutUpdateRemoval:(BOOL)removeParent
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(
      dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{ resolve(replayLayoutUpdateRemoval(removeParent)); });
}

- (void)resumeHost:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_PLATFORM", @"Host pause tests require Android", nil);
}

- (void)startHeadlessTask:(NSString *)taskKey
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_PLATFORM", @"Headless JS tasks require Android", nil);
}

- (void)waitForHeadlessTaskFinish:(NSInteger)taskId
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_PLATFORM", @"Headless JS tasks require Android", nil);
}

- (void)delay:(NSInteger)milliseconds resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_PLATFORM", @"Host pause tests require Android", nil);
}

- (void)hasCurrentActivity:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_PLATFORM", @"Activity checks require Android", nil);
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
  if (view == nil || scheduler == nil) {
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
