#import <React/RCTBridgeModule.h>
#import <React/RCTInvalidating.h>
#import <React/RCTSurfacePresenterStub.h>
#import <React/RCTSurfaceProtocol.h>
#import <React/RCTSurfaceStage.h>
#import <React/RCTSurfaceView.h>
#import <React/RCTUtils.h>

static const CGSize kSurfaceSize = {200, 200};
static const NSTimeInterval kUnmountTimeout = 5;

static UIWindow *FirstSceneWindow(void);

@interface RuntimeTestsSurfaceModule : NSObject <RCTBridgeModule, RCTInvalidating, RCTSurfacePresenterObserver>
@end

@implementation RuntimeTestsSurfaceModule {
  __weak id<RCTSurfacePresenterStub> _surfacePresenter;
  NSMutableDictionary<NSNumber *, id<RCTSurfaceProtocol>> *_surfaces;
  NSMutableDictionary<NSNumber *, RCTPromiseResolveBlock> *_pendingStarts;
  NSMutableDictionary<NSNumber *, RCTPromiseResolveBlock> *_pendingStops;
}

RCT_EXPORT_MODULE(RuntimeTestsSurface)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (instancetype)init
{
  if (self = [super init]) {
    _surfaces = [NSMutableDictionary new];
    _pendingStarts = [NSMutableDictionary new];
    _pendingStops = [NSMutableDictionary new];
  }
  return self;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(start : (NSString *)componentName resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)
{
  id<RCTSurfacePresenterStub> surfacePresenter = [self observedSurfacePresenter];
  if (surfacePresenter == nil) {
    reject(@"E_NO_PRESENTER", @"The surface presenter is not available.", nil);
    return;
  }
  UIWindow *window = FirstSceneWindow();
  if (window == nil) {
    reject(@"E_NO_WINDOW", @"No window is available.", nil);
    return;
  }

  id<RCTSurfaceProtocol> surface = [surfacePresenter createFabricSurfaceForModuleName:componentName
                                                                    initialProperties:@{}];
  [surface setMinimumSize:kSurfaceSize maximumSize:kSurfaceSize];

  UIView *view = surface.view;
  view.frame =
      CGRectMake(0, CGRectGetHeight(window.bounds) - kSurfaceSize.height, kSurfaceSize.width, kSurfaceSize.height);
  view.userInteractionEnabled = NO;
  [window addSubview:view];

  NSNumber *rootTag = @(surface.rootTag);
  _surfaces[rootTag] = surface;
  _pendingStarts[rootTag] = resolve;
  [surface start];
}

RCT_EXPORT_METHOD(stop : (nonnull NSNumber *)rootTag resolve : (RCTPromiseResolveBlock)
                      resolve reject : (RCTPromiseRejectBlock)reject)
{
  id<RCTSurfaceProtocol> surface = _surfaces[rootTag];
  if (surface == nil) {
    reject(@"E_NO_SURFACE", [NSString stringWithFormat:@"No surface has the root tag %@.", rootTag], nil);
    return;
  }
  if (!RCTSurfaceStageIsRunning(surface.stage)) {
    reject(@"E_NOT_RUNNING", [NSString stringWithFormat:@"The surface %@ is not running.", rootTag], nil);
    return;
  }

  [_surfaces removeObjectForKey:rootTag];
  [_pendingStarts removeObjectForKey:rootTag];
  _pendingStops[rootTag] = resolve;

  [surface stop];
  [surface.view removeFromSuperview];

  if (RCTSurfaceStageIsRunning(surface.stage)) {
    [_pendingStops removeObjectForKey:rootTag];
    reject(@"E_STILL_RUNNING", [NSString stringWithFormat:@"The surface %@ did not stop.", rootTag], nil);
    return;
  }

  [self rejectStopOfRootTag:rootTag afterTimeoutWith:reject];
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  [self resolveStartIfContentIsMounted:@(rootTag)];
  [self resolveStopAfterUnmountTransaction:@(rootTag)];
}

- (id<RCTSurfacePresenterStub>)observedSurfacePresenter
{
  if (_surfacePresenter == nil) {
    // React Native gives a legacy module no surface presenter, so the module takes it from the host of the app.
    id sceneDelegate = FirstSceneWindow().windowScene.delegate;
    _surfacePresenter =
        [sceneDelegate valueForKeyPath:@"reactNativeFactory.rootViewFactory.reactHost.surfacePresenter"];
    [_surfacePresenter addObserver:self];
  }
  return _surfacePresenter;
}

- (void)invalidate
{
  [_surfacePresenter removeObserver:self];
  for (id<RCTSurfaceProtocol> surface in _surfaces.allValues) {
    [surface stop];
    [surface.view removeFromSuperview];
  }
  [_surfaces removeAllObjects];
  [_pendingStarts removeAllObjects];
  [_pendingStops removeAllObjects];
}

- (void)rejectStopOfRootTag:(NSNumber *)rootTag afterTimeoutWith:(RCTPromiseRejectBlock)reject
{
  __weak __typeof(self) weakSelf = self;
  dispatch_after(
      dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kUnmountTimeout * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        __typeof(self) strongSelf = weakSelf;
        if (strongSelf == nil || strongSelf->_pendingStops[rootTag] == nil) {
          return;
        }
        [strongSelf->_pendingStops removeObjectForKey:rootTag];
        reject(@"E_NO_UNMOUNT",
               [NSString stringWithFormat:@"The surface %@ had no mount transaction after its stop.", rootTag],
               nil);
      });
}

- (void)resolveStartIfContentIsMounted:(NSNumber *)rootTag
{
  RCTPromiseResolveBlock resolve = _pendingStarts[rootTag];
  if (resolve == nil || ![self hasMountedContent:_surfaces[rootTag]]) {
    return;
  }
  [_pendingStarts removeObjectForKey:rootTag];
  resolve(rootTag);
}

- (void)resolveStopAfterUnmountTransaction:(NSNumber *)rootTag
{
  RCTPromiseResolveBlock resolve = _pendingStops[rootTag];
  if (resolve == nil) {
    return;
  }
  [_pendingStops removeObjectForKey:rootTag];
  resolve(nil);
}

- (BOOL)hasMountedContent:(id<RCTSurfaceProtocol>)surface
{
  UIView *rootComponentView = surface.view.subviews.firstObject;
  return rootComponentView.subviews.count > 0;
}

@end

static UIWindow *FirstSceneWindow(void)
{
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if ([scene isKindOfClass:[UIWindowScene class]]) {
      UIWindow *window = ((UIWindowScene *)scene).windows.firstObject;
      if (window != nil) {
        return window;
      }
    }
  }
  return nil;
}
