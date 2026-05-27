#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorAttachQueue.h>
#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorObserver.h>

#import <React/RCTAssert.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>

#import <objc/runtime.h>

using namespace facebook::react;

static char kREAPseudoSelectorObserversKey;

static void attachObserverToView(
    REAUIView *view,
    reanimated::PseudoSelector selector,
    const std::shared_ptr<std::function<void(bool)>> &sharedCallback)
{
  NSMutableDictionary<NSNumber *, REAPseudoSelectorObserver *> *observers =
      objc_getAssociatedObject(view, &kREAPseudoSelectorObserversKey);
  if (!observers) {
    observers = [NSMutableDictionary new];
    objc_setAssociatedObject(view, &kREAPseudoSelectorObserversKey, observers, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  }
  NSNumber *key = @(static_cast<int>(selector));
  [observers[key] detach];
  REAPseudoSelectorObserver *observer = [[REAPseudoSelectorObserver alloc] initWithView:view
                                                                               selector:selector
                                                                               callback:*sharedCallback];
  observers[key] = observer;
}

@implementation REAPseudoSelectorAttachQueue {
  __weak RCTSurfacePresenter *_surfacePresenter;
  // Outer key: tag, inner key: selector. Lets `didMountComponentsWithRootTag:`
  // look up pending entries by tag directly instead of parsing composite string keys.
  NSMutableDictionary<NSNumber *, NSMutableDictionary<NSNumber *, void (^)(REAUIView *)> *> *_pendingAttaches;
}

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
{
  if (self = [super init]) {
    _surfacePresenter = surfacePresenter;
    _pendingAttaches = [NSMutableDictionary new];
    // `addObserver:` is deprecated in favor of `RCTMountingTransactionObserverCoordinator`, but the
    // replacement only accepts ComponentView classes as observers - there's no external-observer
    // hook, so migrating would require a custom always-present ComponentView per surface.
    [surfacePresenter addObserver:self];
  }
  return self;
}

- (void)dealloc
{
  RCTSurfacePresenter *surfacePresenter = _surfacePresenter;
  if (surfacePresenter) {
    [surfacePresenter removeObserver:self];
  }
}

- (void)attachTag:(int)tag
          selector:(reanimated::PseudoSelector)selector
    sharedCallback:(std::shared_ptr<std::function<void(bool)>>)sharedCallback
{
  RCTAssertMainQueue();
  REAUIView *view = [_surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
  if (view) {
    attachObserverToView(view, selector, sharedCallback);
    return;
  }
  // TODO: entries are only cleared on successful mount or explicit detach.
  // Tags whose view never mounts (and never receive a detach) leak across the app lifetime.
  NSNumber *tagKey = @(tag);
  NSMutableDictionary<NSNumber *, void (^)(REAUIView *)> *bySelector = _pendingAttaches[tagKey];
  if (!bySelector) {
    bySelector = [NSMutableDictionary new];
    _pendingAttaches[tagKey] = bySelector;
  }
  bySelector[@(static_cast<int>(selector))] =
      [^(REAUIView *mountedView) { attachObserverToView(mountedView, selector, sharedCallback); } copy];
}

- (void)detachTag:(int)tag selector:(reanimated::PseudoSelector)selector
{
  RCTAssertMainQueue();
  NSNumber *tagKey = @(tag);
  NSNumber *selectorKey = @(static_cast<int>(selector));
  NSMutableDictionary<NSNumber *, void (^)(REAUIView *)> *bySelector = _pendingAttaches[tagKey];
  if (bySelector) {
    [bySelector removeObjectForKey:selectorKey];
    if (bySelector.count == 0) {
      [_pendingAttaches removeObjectForKey:tagKey];
    }
  }

  REAUIView *view = [_surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
  if (!view) {
    return;
  }
  NSMutableDictionary<NSNumber *, REAPseudoSelectorObserver *> *observers =
      objc_getAssociatedObject(view, &kREAPseudoSelectorObserversKey);
  [observers[selectorKey] detach];
  [observers removeObjectForKey:selectorKey];
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();
  if (_pendingAttaches.count == 0) {
    return;
  }
  RCTComponentViewRegistry *registry = _surfacePresenter.mountingManager.componentViewRegistry;
  NSArray<NSNumber *> *tagKeys = [_pendingAttaches.allKeys copy];
  for (NSNumber *tagKey in tagKeys) {
    REAUIView *view = [registry findComponentViewWithTag:(Tag)tagKey.intValue];
    if (!view) {
      continue;
    }
    NSMutableDictionary<NSNumber *, void (^)(REAUIView *)> *bySelector = _pendingAttaches[tagKey];
    [_pendingAttaches removeObjectForKey:tagKey];
    for (void (^block)(REAUIView *) in bySelector.allValues) {
      block(view);
    }
  }
}

@end
