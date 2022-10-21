#import <RNReanimated/ScreensTransitionDelegate.h>

@implementation SharedViewConfig {
  UIView *_view;
}

- (instancetype)initWithTag:(NSNumber *)viewTag
{
  self = [super init];
  _viewTag = viewTag;
  _toRemove = false;
  return self;
}

- (void)setView:(UIView *)view;
{
  _view = view;
  _toRemove = false;
}

- (UIView *)getView;
{
  _toRemove = true;
  UIView *viewPtr = _view;
  _view = nil;
  return viewPtr;
}

@end

@implementation ScreensTransitionDelegate {
  NSMutableDictionary *_snapshotRegistry;
  NSMutableSet<NSNumber *> *_toRestore;
}

@synthesize sharedTransitionsItems;
@synthesize sharedElementsIterationOrder;

- (instancetype)init
{
  self = [super init];
  sharedTransitionsItems = [NSMutableDictionary<NSString *, NSMutableArray<SharedViewConfig *> *> new];
  sharedElementsIterationOrder = [NSMutableArray<NSString *> new];
  _snapshotRegistry = [NSMutableDictionary new];
  _toRestore = [NSMutableSet<NSNumber *> new];
  return self;
}

- (void)runTransitionWithConverterView:(UIView *)converter
                              fromView:(UIView *)fromView
                     fromViewConverter:(UIView *)startingViewConverter
                                toView:(UIView *)toView
                       toViewConverter:(UIView *)toViewConverter
                        transitionType:(NSString *)transitionType
{
  if ([transitionType isEqualToString:@"sharedElementTransition"]) {
    [_toRestore addObject:fromView.reactTag];
    REASnapshot *before = _snapshotRegistry[fromView.reactTag];
    REASnapshot *after = _snapshotRegistry[toView.reactTag];
    [_animationsManager onViewTransition:fromView before:before after:after];
    [_animationsManager onViewTransition:toView before:before after:after];
  } else {
    // TODO: animate screen transition
  }
}

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  if (!sharedTransitionsItems[transitionTag]) {
    [sharedElementsIterationOrder addObject:transitionTag];
    sharedTransitionsItems[transitionTag] = [NSMutableArray<SharedViewConfig *> new];
  }
  SharedViewConfig *sharedViewConfig = [[SharedViewConfig new] initWithTag:viewTag];
  [self->sharedTransitionsItems[transitionTag] addObject:sharedViewConfig];
}

- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  for (SharedViewConfig *config in sharedTransitionsItems[transitionTag]) {
    NSNumber *currentViewTag = config.viewTag;
    if (currentViewTag == viewTag) {
      config.toRemove = true;
    }
  }
}

- (void)afterPreparingCallback
{
  for (NSString *transitionTag in sharedTransitionsItems) {
    NSMutableArray<SharedViewConfig *> *sharedViewConfigs = sharedTransitionsItems[transitionTag];
    NSMutableArray *discardedItems = [NSMutableArray array];
    for (SharedViewConfig *config in sharedViewConfigs) {
      if (config.toRemove) {
        [discardedItems addObject:config];
      }
    }
    [sharedViewConfigs removeObjectsInArray:discardedItems];
    if ([sharedTransitionsItems[transitionTag] count] == 0) {
      [sharedTransitionsItems removeObjectForKey:transitionTag];
      [sharedElementsIterationOrder removeObject:transitionTag];
    }
  }
}

- (void)notifyAboutViewDidDisappear:(UIView *)screeen
{
  REANodesManager *reanimatedNodeManager = [_animationsManager getNodeManager];
  for (NSNumber *viewTag in _toRestore) {
    // _snapshotRegistry containst last snapshot of component state before transition start
    REASnapshot *initialState = _snapshotRegistry[viewTag];
    [_animationsManager stopAnimation:viewTag];
    [reanimatedNodeManager updateProps:initialState.values ofViewWithTag:viewTag withName:@"UIView"];
  }
  [_toRestore removeAllObjects];
}

- (void)makeSnapshot:(UIView *)view withViewController:(UIView *)viewController
{
  _snapshotRegistry[view.reactTag] = [[REASnapshot alloc] init:view withParent:viewController];
}

- (NSMutableArray<SharedElementConfig *> *)
    getSharedElementsForCurrentTransition:(UIViewController *)currentViewController
                     targetViewController:(UIViewController *)targetViewController
{
  NSMutableArray<SharedElementConfig *> *sharedElementsArray = [NSMutableArray new];
  RNSScreenView *screenView = (RNSScreenView *)currentViewController.view;

  RCTUIManager *uiManager = [screenView bridge].uiManager;
  NSNumber *rootTag = screenView.rootTag;
  for (NSString *key in [sharedElementsIterationOrder reverseObjectEnumerator]) {
    NSArray<SharedViewConfig *> *sharedViewConfigs = sharedTransitionsItems[key];
    UIView *fromView, *toView;
    for (SharedViewConfig *sharedViewConfig in sharedViewConfigs) {
      UIView *view = [uiManager viewForReactTag:sharedViewConfig.viewTag];
      if (view == nil) {
        view = [sharedViewConfig getView];
      } else {
        [sharedViewConfig setView:view];
      }
      UIViewController *viewViewController = view.reactViewController;
      if (viewViewController == currentViewController) {
        fromView = view;
      }
      if (viewViewController == targetViewController) {
        toView = view;
      }
    }

    BOOL isAnyNull = fromView == nil || toView == nil;
    BOOL hasCorrectRootTag = [fromView rootTag] == rootTag && [toView rootTag] == rootTag;
    if (isAnyNull || !hasCorrectRootTag) {
      continue;
    }

    if (fromView != nil && toView != nil) {
      SharedElementConfig *sharedElementConfig = [[SharedElementConfig alloc] initWithFromView:fromView
                                                                                        toView:toView
                                                                                 fromContainer:fromView.reactSuperview
                                                                                 fromViewFrame:fromView.frame];
      [sharedElementsArray addObject:sharedElementConfig];
    }
  }

  // we reparent starting view and animate it, then reparent it back after the transition
  for (SharedElementConfig *sharedElementConfig in [sharedElementsArray reverseObjectEnumerator]) {
    UIView *start = sharedElementConfig.fromView;
    UIView *end = sharedElementConfig.toView;
    [self makeSnapshot:start withViewController:sharedElementConfig.fromContainer];
    [self makeSnapshot:end withViewController:end.superview];

    UIView *startContainer = start.reactSuperview;
    int startIndex = (int)[[startContainer reactSubviews] indexOfObject:start];
    [start removeFromSuperview];
    end.hidden = YES;
    sharedElementConfig.fromViewIndex = startIndex;
  }

  [self afterPreparingCallback];

  return sharedElementsArray;
}

- (void)onScreenTransitionCreate:(id)screen_
{
  RNSScreen *screen = screen_;
  if (screen.transitionCoordinator != nil) {
    screen.fakeView.alpha = 0.0;
    NSMutableArray<SharedElementConfig *> *sharedElements;
    if (screen.closing) {
      UIViewController *targetViewController =
          [screen.transitionCoordinator viewControllerForKey:UITransitionContextToViewControllerKey];
      sharedElements = [self getSharedElementsForCurrentTransition:screen targetViewController:targetViewController];
      [self asignEndingValuesWithTransitionContext:screen.transitionCoordinator
                                    sharedElements:sharedElements
                                      goingForward:screen.goingForward];
    }

    [screen.transitionCoordinator
        animateAlongsideTransition:^(id<UIViewControllerTransitionCoordinatorContext> _Nonnull context) {
          [[context containerView] addSubview:screen.fakeView];
          screen.fakeView.alpha = 1.0;
          if (screen.closing && sharedElements != nil) {
            // right order is important, first parent then children, to keep right z-index order
            for (SharedElementConfig *sharedElement in sharedElements) {
              [[context containerView] addSubview:sharedElement.fromView];
            }
          }

          screen.animationTimer = [CADisplayLink displayLinkWithTarget:screen selector:@selector(handleAnimation)];
          [screen.animationTimer addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
        }
        completion:^(id<UIViewControllerTransitionCoordinatorContext> _Nonnull context) {
          [self cleanupAfterTransitionWithSharedElements:sharedElements screen:screen];
        }];
  }
}

- (void)cleanupAfterTransitionWithSharedElements:(NSMutableArray<SharedElementConfig *> *)sharedElements
                                          screen:(RNSScreen *)screen
{
  for (SharedElementConfig *sharedElement in sharedElements) {
    UIView *startingView = sharedElement.fromView;
    [startingView removeFromSuperview];
    UIView *startContainer = sharedElement.fromContainer;
    int index = sharedElement.fromViewIndex;
    [startContainer insertSubview:startingView atIndex:index];
    startingView.frame = sharedElement.fromViewFrame;
    UIView *endingView = sharedElement.toView;
    endingView.hidden = NO;
  }

  [screen.animationTimer setPaused:YES];
  [screen.animationTimer invalidate];
  [screen.fakeView removeFromSuperview];
}

- (void)asignEndingValuesWithTransitionContext:(id<UIViewControllerTransitionCoordinator> _Nonnull)context
                                sharedElements:(NSMutableArray<SharedElementConfig *> *)sharedElements
                                  goingForward:(BOOL)goingForward
{
  UIViewController *toViewController = [context viewControllerForKey:UITransitionContextToViewControllerKey];
  [toViewController.view setNeedsLayout];
  [toViewController.view layoutIfNeeded];

  for (SharedElementConfig *sharedElement in sharedElements) {
    UIView *startingView = sharedElement.fromView;
    UIView *startingViewParent = sharedElement.fromContainer;
    UIView *endingView = sharedElement.toView;

    [self runTransitionWithConverterView:[context containerView]
                                fromView:startingView
                       fromViewConverter:startingViewParent
                                  toView:endingView
                         toViewConverter:endingView.superview
                          transitionType:@"sharedElementTransition"];
  }
}

@end
