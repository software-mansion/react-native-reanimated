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
  NSMutableDictionary<NSString *, void (^)(REAUIView *)> *_pendingAttaches;
}

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
{
  if (self = [super init]) {
    _surfacePresenter = surfacePresenter;
    _pendingAttaches = [NSMutableDictionary new];
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
  } else {
    NSString *key = [NSString stringWithFormat:@"%d:%d", tag, static_cast<int>(selector)];
    _pendingAttaches[key] =
        [^(REAUIView *mountedView) { attachObserverToView(mountedView, selector, sharedCallback); } copy];
  }
}

- (void)detachTag:(int)tag selector:(reanimated::PseudoSelector)selector
{
  RCTAssertMainQueue();
  NSString *key = [NSString stringWithFormat:@"%d:%d", tag, static_cast<int>(selector)];
  [_pendingAttaches removeObjectForKey:key];

  REAUIView *view = [_surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
  if (!view) {
    return;
  }
  NSMutableDictionary<NSNumber *, REAPseudoSelectorObserver *> *observers =
      objc_getAssociatedObject(view, &kREAPseudoSelectorObserversKey);
  NSNumber *obsKey = @(static_cast<int>(selector));
  [observers[obsKey] detach];
  [observers removeObjectForKey:obsKey];
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();
  if (_pendingAttaches.count == 0) {
    return;
  }
  RCTComponentViewRegistry *registry = _surfacePresenter.mountingManager.componentViewRegistry;
  NSArray<NSString *> *keys = [_pendingAttaches.allKeys copy];
  for (NSString *key in keys) {
    int tag = [[key componentsSeparatedByString:@":"][0] intValue];
    REAUIView *view = [registry findComponentViewWithTag:(Tag)tag];
    if (view) {
      void (^block)(REAUIView *) = _pendingAttaches[key];
      [_pendingAttaches removeObjectForKey:key];
      block(view);
    }
  }
}

@end
