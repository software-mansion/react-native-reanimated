#if __has_include(<RNScreens/RNSScreen.h>)

#import <RNReanimated/REASharedTransitionAnimationManager.h>
#import <RNReanimated/REASharedTransitionConfig.h>
#import <RNReanimated/REASharedViewConfig.h>
#import <RNScreens/RNSScreen.h>

@implementation REASharedTransitionAnimationManager {
  NSMutableDictionary *_snapshotRegistry;
  NSMutableSet<NSNumber *> *_viewTagsToRestoreStyle;
  NSMutableDictionary<NSString *, NSMutableArray<REASharedViewConfig *> *> *_sharedTransitionsItems;
  NSMutableArray<NSString *> *_sharedElementsIterationOrder;
  REAAnimationsManager *_animationsManager;
  NSMutableSet<NSNumber *> *_viewTagsWithSharedTransition;
  NSMutableDictionary<NSNumber *, UIView *> *_removedViewRegistry;
}

- (instancetype)init
{
  self = [super init];
  _sharedTransitionsItems = [NSMutableDictionary<NSString *, NSMutableArray<REASharedViewConfig *> *> new];
  _sharedElementsIterationOrder = [NSMutableArray<NSString *> new];
  _snapshotRegistry = [NSMutableDictionary new];
  _viewTagsToRestoreStyle = [NSMutableSet<NSNumber *> new];
  _viewTagsWithSharedTransition = [NSMutableSet<NSNumber *> new];
  _removedViewRegistry = [NSMutableDictionary<NSNumber *, UIView *> new];
  return self;
}

- (void)registerTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  if (!_sharedTransitionsItems[transitionTag]) {
    [_sharedElementsIterationOrder addObject:transitionTag];
    _sharedTransitionsItems[transitionTag] = [NSMutableArray<REASharedViewConfig *> new];
  }
  REASharedViewConfig *sharedViewConfig = [[REASharedViewConfig new] initWithTag:viewTag];
  [self->_sharedTransitionsItems[transitionTag] addObject:sharedViewConfig];
  [_viewTagsWithSharedTransition addObject:viewTag];
}

- (void)unregisterTransitionTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  for (REASharedViewConfig *config in _sharedTransitionsItems[transitionTag]) {
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
  for (NSNumber *viewTag in _viewTagsToRestoreStyle) {
    [_animationsManager stopAnimation:viewTag];
    REASnapshot *initialState = _snapshotRegistry[viewTag];
    [_snapshotRegistry removeObjectForKey:viewTag];
    [reanimatedNodeManager updateProps:initialState.values ofViewWithTag:viewTag withName:@"UIView"];
  }
  [_viewTagsToRestoreStyle removeAllObjects];
}

- (void)onScreenRemoving:(UIView *)screen
{
  [self saveSharedTransitionItemsUnderTree:screen];
}

- (void)setAnimationsManager:(REAAnimationsManager *)animationsManager
{
  _animationsManager = animationsManager;
}

- (void)saveSharedTransitionItemsUnderTree:(UIView *)view
{
  if ([_viewTagsWithSharedTransition containsObject:view.reactTag]) {
    _removedViewRegistry[view.reactTag] = view;
  }
  for (UIView *child in view.subviews) {
    [self saveSharedTransitionItemsUnderTree:child];
  }
}

- (void)runTransitionFromView:(UIView *)fromView toView:(UIView *)toView transitionType:(NSString *)transitionType
{
  if ([transitionType isEqualToString:@"sharedElementTransition"]) {
    [_viewTagsToRestoreStyle addObject:fromView.reactTag];
    REASnapshot *before = _snapshotRegistry[fromView.reactTag];
    REASnapshot *after = _snapshotRegistry[toView.reactTag];
    [_animationsManager onViewTransition:fromView before:before after:after];
    [_animationsManager onViewTransition:toView before:before after:after];
  }
}

- (void)cleanRegisters
{
  [_removedViewRegistry removeAllObjects];
  for (NSString *transitionTag in _sharedTransitionsItems) {
    NSMutableArray<REASharedViewConfig *> *sharedViewConfigs = _sharedTransitionsItems[transitionTag];
    NSMutableArray *discardedItems = [NSMutableArray array];
    for (REASharedViewConfig *config in sharedViewConfigs) {
      if (config.toRemove) {
        [discardedItems addObject:config];
        [_viewTagsWithSharedTransition removeObject:config.viewTag];
      }
    }
    [sharedViewConfigs removeObjectsInArray:discardedItems];
    if ([_sharedTransitionsItems[transitionTag] count] == 0) {
      [_sharedTransitionsItems removeObjectForKey:transitionTag];
      [_sharedElementsIterationOrder removeObject:transitionTag];
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
  for (NSString *key in [_sharedElementsIterationOrder reverseObjectEnumerator]) {
    NSArray<REASharedViewConfig *> *sharedViewConfigs = _sharedTransitionsItems[key];
    UIView *fromView, *toView;
    for (REASharedViewConfig *sharedViewConfig in sharedViewConfigs) {
      UIView *view = [uiManager viewForReactTag:sharedViewConfig.viewTag];
      if (view == nil) {
        view = _removedViewRegistry[sharedViewConfig.viewTag];
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

  [self cleanRegisters];

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

#endif
