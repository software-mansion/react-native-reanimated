#import <RNReanimated/REASharedTransitionAnimationManager.h>
#import <RNReanimated/REASharedTransitionConfig.h>
#import <RNReanimated/REASharedViewConfig.h>
#import <RNScreens/RNSScreen.h>

@implementation REASharedTransitionAnimationManager {
  NSMutableDictionary *_snapshotRegistry;
  NSMutableSet<NSNumber *> *_toRestore;
  NSMutableDictionary<NSString *, NSMutableArray<REASharedViewConfig *> *> *sharedTransitionsItems;
  NSMutableArray<NSString *> *sharedElementsIterationOrder;
  REAAnimationsManager *_animationsManager;
}

- (instancetype)init
{
  self = [super init];
  sharedTransitionsItems = [NSMutableDictionary<NSString *, NSMutableArray<REASharedViewConfig *> *> new];
  sharedElementsIterationOrder = [NSMutableArray<NSString *> new];
  _snapshotRegistry = [NSMutableDictionary new];
  _toRestore = [NSMutableSet<NSNumber *> new];
  return self;
}

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  if (!sharedTransitionsItems[transitionTag]) {
    [sharedElementsIterationOrder addObject:transitionTag];
    sharedTransitionsItems[transitionTag] = [NSMutableArray<REASharedViewConfig *> new];
  }
  REASharedViewConfig *sharedViewConfig = [[REASharedViewConfig new] initWithTag:viewTag];
  [self->sharedTransitionsItems[transitionTag] addObject:sharedViewConfig];
}

- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  for (REASharedViewConfig *config in sharedTransitionsItems[transitionTag]) {
    NSNumber *currentViewTag = config.viewTag;
    if (currentViewTag == viewTag) {
      config.toRemove = true;
    }
  }
}

- (void)onScreenTransitionCreate:(id)currentScreen
{
  RNSScreen *screen = currentScreen;
  if (screen.transitionCoordinator != nil) {
    screen.fakeView.alpha = 0.0;
    NSMutableArray<REASharedTransitionConfig *> *sharedElements;
    if (screen.closing) {
      UIViewController *targetViewController =
          [screen.transitionCoordinator viewControllerForKey:UITransitionContextToViewControllerKey];
      sharedElements = [self getSharedElementsForCurrentTransition:screen targetViewController:targetViewController];
      [self runTransitions:screen.transitionCoordinator sharedElements:sharedElements];
    }

    [screen.transitionCoordinator
        animateAlongsideTransition:^(id<UIViewControllerTransitionCoordinatorContext> _Nonnull context) {
          [[context containerView] addSubview:screen.fakeView];
          screen.fakeView.alpha = 1.0;
          if (screen.closing && sharedElements != nil) {
            // right order is important, first parent then children, to keep right z-index order
            for (REASharedTransitionConfig *sharedElement in sharedElements) {
              [[context containerView] addSubview:sharedElement.fromView];
            }
          }

          screen.animationTimer = [CADisplayLink displayLinkWithTarget:screen selector:@selector(handleAnimation)];
          [screen.animationTimer addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
        }
        completion:^(id<UIViewControllerTransitionCoordinatorContext> _Nonnull context) {
          [self cleanupAfterTransition:sharedElements screen:screen];
        }];
  }
}

- (void)onNativeAnimationEnd:(UIView *)screeen
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

- (void)setAnimationsManager:(REAAnimationsManager *)animationsManager
{
  _animationsManager = animationsManager;
}

- (void)runTransitionFromView:(UIView *)fromView toView:(UIView *)toView transitionType:(NSString *)transitionType
{
  if ([transitionType isEqualToString:@"sharedElementTransition"]) {
    [_toRestore addObject:fromView.reactTag];
    REASnapshot *before = _snapshotRegistry[fromView.reactTag];
    REASnapshot *after = _snapshotRegistry[toView.reactTag];
    [_animationsManager onViewTransition:fromView before:before after:after];
    [_animationsManager onViewTransition:toView before:before after:after];
  }
}

- (void)afterPreparingCallback
{
  for (NSString *transitionTag in sharedTransitionsItems) {
    NSMutableArray<REASharedViewConfig *> *sharedViewConfigs = sharedTransitionsItems[transitionTag];
    NSMutableArray *discardedItems = [NSMutableArray array];
    for (REASharedViewConfig *config in sharedViewConfigs) {
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

- (void)makeSnapshot:(UIView *)view withViewController:(UIView *)viewController
{
  _snapshotRegistry[view.reactTag] = [[REASnapshot alloc] init:view withParent:viewController];
}

- (NSMutableArray<REASharedTransitionConfig *> *)
    getSharedElementsForCurrentTransition:(UIViewController *)currentViewController
                     targetViewController:(UIViewController *)targetViewController
{
  NSMutableArray<REASharedTransitionConfig *> *sharedTransitionConfigArray = [NSMutableArray new];
  RNSScreenView *screenView = (RNSScreenView *)currentViewController.view;

  RCTUIManager *uiManager = [screenView bridge].uiManager;
  NSNumber *rootTag = screenView.rootTag;
  for (NSString *key in [sharedElementsIterationOrder reverseObjectEnumerator]) {
    NSArray<REASharedViewConfig *> *sharedViewConfigs = sharedTransitionsItems[key];
    UIView *fromView, *toView;
    for (REASharedViewConfig *sharedViewConfig in sharedViewConfigs) {
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
      REASharedTransitionConfig *sharedTransitionConfig =
          [[REASharedTransitionConfig alloc] initWithFromView:fromView
                                                       toView:toView
                                                fromContainer:fromView.reactSuperview
                                                fromViewFrame:fromView.frame];
      [sharedTransitionConfigArray addObject:sharedTransitionConfig];
    }
  }

  // we reparent starting view and animate it, then reparent it back after the transition
  for (REASharedTransitionConfig *sharedTransitionConfig in [sharedTransitionConfigArray reverseObjectEnumerator]) {
    UIView *start = sharedTransitionConfig.fromView;
    UIView *end = sharedTransitionConfig.toView;
    [self makeSnapshot:start withViewController:sharedTransitionConfig.fromContainer];
    [self makeSnapshot:end withViewController:end.superview];

    UIView *startContainer = start.reactSuperview;
    int startIndex = (int)[[startContainer reactSubviews] indexOfObject:start];
    [start removeFromSuperview];
    end.hidden = YES;
    sharedTransitionConfig.fromViewIndex = startIndex;
  }

  [self afterPreparingCallback];

  return sharedTransitionConfigArray;
}

- (void)cleanupAfterTransition:(NSMutableArray<REASharedTransitionConfig *> *)sharedTransitionConfigs
                        screen:(RNSScreen *)screen
{
  for (REASharedTransitionConfig *sharedTransitionConfig in sharedTransitionConfigs) {
    UIView *startingView = sharedTransitionConfig.fromView;
    [startingView removeFromSuperview];
    UIView *startContainer = sharedTransitionConfig.fromContainer;
    int index = sharedTransitionConfig.fromViewIndex;
    [startContainer insertSubview:startingView atIndex:index];
    startingView.frame = sharedTransitionConfig.fromViewFrame;
    UIView *endingView = sharedTransitionConfig.toView;
    endingView.hidden = NO;
  }

  [screen.animationTimer setPaused:YES];
  [screen.animationTimer invalidate];
  [screen.fakeView removeFromSuperview];
}

- (void)runTransitions:(id<UIViewControllerTransitionCoordinator> _Nonnull)transitionContainer
        sharedElements:(NSMutableArray<REASharedTransitionConfig *> *)sharedTransitionConfigs
{
  UIViewController *toViewController =
      [transitionContainer viewControllerForKey:UITransitionContextToViewControllerKey];
  [toViewController.view setNeedsLayout];
  [toViewController.view layoutIfNeeded];

  for (REASharedTransitionConfig *sharedTransitionConfig in sharedTransitionConfigs) {
    [self runTransitionFromView:sharedTransitionConfig.fromView
                         toView:sharedTransitionConfig.toView
                 transitionType:@"sharedElementTransition"];
  }
}

@end
