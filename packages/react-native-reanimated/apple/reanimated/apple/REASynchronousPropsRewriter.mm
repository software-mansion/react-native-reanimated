#import <reanimated/apple/REASynchronousPropsRewriter.h>

#import <React/RCTAssert.h>

@implementation REASynchronousPropsRewriter {
  __weak RCTSurfacePresenter *_surfacePresenter;
  std::weak_ptr<reanimated::ReanimatedModuleProxy> _reanimatedModuleProxy;
}

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
                   reanimatedModuleProxy:
                       (const std::shared_ptr<reanimated::ReanimatedModuleProxy> &)reanimatedModuleProxy
{
  if (self = [super init]) {
    _surfacePresenter = surfacePresenter;
    _reanimatedModuleProxy = reanimatedModuleProxy;
    // `addObserver:` is deprecated, but its replacement has no hook for an external observer.
    // See `REAPseudoSelectorAttachQueue`.
    [surfacePresenter addObserver:self];
  }
  return self;
}

- (void)dealloc
{
  [_surfacePresenter removeObserver:self];
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();
  if (const auto reanimatedModuleProxy = _reanimatedModuleProxy.lock()) {
    reanimatedModuleProxy->rewriteSynchronousProps();
  }
}

@end
