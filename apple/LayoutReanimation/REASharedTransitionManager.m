#import <RNReanimated/REAFrame.h>
#import <RNReanimated/REAScreensHelper.h>
#import <RNReanimated/REASharedElement.h>
#import <RNReanimated/REASharedTransitionManager.h>
#import <RNReanimated/REAUtils.h>

#import <React/RCTUIKit.h>

@implementation REASharedTransitionManager {
  NSMutableDictionary<NSNumber *, RCTUIView *> *_sharedTransitionParent;
  NSMutableDictionary<NSNumber *, NSNumber *> *_sharedTransitionInParentIndex;
  NSMutableDictionary<NSNumber *, REASnapshot *> *_snapshotRegistry;
  NSMutableDictionary<NSNumber *, RCTUIView *> *_currentSharedTransitionViews;
  REAFindPrecedingViewTagForTransitionBlock _findPrecedingViewTagForTransition;
  REACancelAnimationBlock _cancelLayoutAnimation;
  RCTUIView *_transitionContainer;
  NSMutableArray<RCTUIView *> *_addedSharedViews;
  BOOL _isSharedTransitionActive;
  NSMutableArray<REASharedElement *> *_sharedElements;
  REAAnimationsManager *_animationManager;
  NSMutableSet<NSNumber *> *_viewsToHide;
  NSMutableArray<RCTUIView *> *_removedViews;
  NSMutableSet<RCTUIView *> *_viewsWithCanceledAnimation;
  NSMutableDictionary<NSNumber *, NSNumber *> *_disableCleaningForView;
  NSMutableSet<NSNumber *> *_layoutedSharedViewsTags;
  NSMutableDictionary<NSNumber *, REAFrame *> *_layoutedSharedViewsFrame;
  BOOL _isStackDropped;
  BOOL _isAsyncSharedTransitionConfigured;
  BOOL _isConfigured;
  BOOL _clearScreen;
}

/*
  `_sharedTransitionManager` provides access to current REASharedTransitionManager
  instance from swizzled methods in react-native-screens. Swizzled method has
  different context of execution (self != REASharedTransitionManager)
*/
static REASharedTransitionManager *_sharedTransitionManager;

- (instancetype)initWithAnimationsManager:(REAAnimationsManager *)animationManager
{
  if (self = [super init]) {
    _snapshotRegistry = [NSMutableDictionary new];
    _currentSharedTransitionViews = [NSMutableDictionary new];
    _addedSharedViews = [NSMutableArray new];
    _sharedTransitionParent = [NSMutableDictionary new];
    _sharedTransitionInParentIndex = [NSMutableDictionary new];
    _isSharedTransitionActive = NO;
    _sharedElements = [NSMutableArray new];
    _animationManager = animationManager;
    _viewsToHide = [NSMutableSet new];
    _sharedTransitionManager = self;
    _viewsWithCanceledAnimation = [NSMutableSet new];
    _disableCleaningForView = [NSMutableDictionary new];
    _layoutedSharedViewsTags = [NSMutableSet new];
    _layoutedSharedViewsFrame = [NSMutableDictionary new];
    _isAsyncSharedTransitionConfigured = NO;
    _isConfigured = NO;
    [self swizzleScreensMethods];
  }
  return self;
}

- (void)invalidate
{
  _snapshotRegistry = nil;
  _currentSharedTransitionViews = nil;
  _addedSharedViews = nil;
  _sharedTransitionParent = nil;
  _sharedTransitionInParentIndex = nil;
  _sharedElements = nil;
  _animationManager = nil;
}

- (RCTUIView *)getTransitioningView:(NSNumber *)tag
{
  return _currentSharedTransitionViews[tag];
}

- (void)notifyAboutNewView:(RCTUIView *)view
{
  if (!_isConfigured) {
    return;
  }
  [_addedSharedViews addObject:view];
}

- (void)notifyAboutViewLayout:(RCTUIView *)view withViewFrame:(CGRect)frame
{
  if (!_isConfigured) {
    return;
  }
  [_layoutedSharedViewsTags addObject:view.reactTag];
  float x = frame.origin.x;
  float y = frame.origin.y;
  float width = frame.size.width;
  float height = frame.size.height;
  _layoutedSharedViewsFrame[view.reactTag] = [[REAFrame alloc] initWithX:x y:y width:width height:height];
}

- (void)viewsDidLayout
{
  if (!_isConfigured) {
    return;
  }
  [self configureAsyncSharedTransitionForViews:_addedSharedViews];
  [_addedSharedViews removeAllObjects];
  [self maybeRestartAnimationWithNewLayout];
  [_layoutedSharedViewsTags removeAllObjects];
  [_layoutedSharedViewsFrame removeAllObjects];
}

- (void)configureAsyncSharedTransitionForViews:(NSArray<RCTUIView *> *)views
{
  if ([views count] > 0) {
    NSArray *sharedViews = [self sortViewsByTags:views];
    _sharedElements = [self getSharedElementForCurrentTransition:sharedViews withNewElements:YES];
    [self resolveAnimationType:_sharedElements isInteractive:NO];
    _isAsyncSharedTransitionConfigured = YES;
  }
}

- (void)maybeRestartAnimationWithNewLayout
{
  if ([_layoutedSharedViewsTags count] == 0 || [_currentSharedTransitionViews count] == 0) {
    return;
  }
  NSMutableArray<REASharedElement *> *sharedElementToRestart = [NSMutableArray new];
  for (REASharedElement *sharedElement in _sharedElements) {
    NSNumber *viewTag = sharedElement.targetView.reactTag;
    if ([_layoutedSharedViewsTags containsObject:viewTag] && _currentSharedTransitionViews[viewTag]) {
      [sharedElementToRestart addObject:sharedElement];
    }
  }

  for (REASharedElement *sharedElement in sharedElementToRestart) {
    RCTUIView *sourceView = sharedElement.sourceView;
    RCTUIView *targetView = sharedElement.targetView;

    REASnapshot *newSourceViewSnapshot = [[REASnapshot alloc] initWithAbsolutePosition:sourceView];
    REASnapshot *currentTargetViewSnapshot = _snapshotRegistry[targetView.reactTag];
    REAFrame *frameData = _layoutedSharedViewsFrame[targetView.reactTag];
    float currentOriginX = [currentTargetViewSnapshot.values[@"originX"] floatValue];
    float currentOriginY = [currentTargetViewSnapshot.values[@"originY"] floatValue];
    float currentOriginXByParent = [currentTargetViewSnapshot.values[@"originXByParent"] floatValue];
    float currentOriginYByParent = [currentTargetViewSnapshot.values[@"originYByParent"] floatValue];
    NSNumber *newOriginX = @(currentOriginX - currentOriginXByParent + frameData.x);
    NSNumber *newOriginY = @(currentOriginY - currentOriginYByParent + frameData.y);
    currentTargetViewSnapshot.values[@"width"] = @(frameData.width);
    currentTargetViewSnapshot.values[@"height"] = @(frameData.height);
    currentTargetViewSnapshot.values[@"originX"] = newOriginX;
    currentTargetViewSnapshot.values[@"originY"] = newOriginY;
    currentTargetViewSnapshot.values[@"globalOriginX"] = newOriginX;
    currentTargetViewSnapshot.values[@"globalOriginY"] = newOriginY;
    currentTargetViewSnapshot.values[@"originXByParent"] = @(frameData.x);
    currentTargetViewSnapshot.values[@"originYByParent"] = @(frameData.y);
    sharedElement.sourceViewSnapshot = newSourceViewSnapshot;

    [self disableCleaningForViewTag:sourceView.reactTag];
    [self disableCleaningForViewTag:targetView.reactTag];
  }
  [self startSharedTransition:sharedElementToRestart];
}

- (BOOL)configureAndStartSharedTransitionForViews:(NSArray<RCTUIView *> *)views isInteractive:(BOOL)isInteractive
{
  NSArray *sharedViews = [self sortViewsByTags:views];
  NSArray<REASharedElement *> *sharedElements = [self getSharedElementForCurrentTransition:sharedViews
                                                                           withNewElements:NO];
  if ([sharedElements count] == 0) {
    return NO;
  }
  [self resolveAnimationType:sharedElements isInteractive:isInteractive];
  [self configureTransitionContainer];
  [self reparentSharedViewsForCurrentTransition:sharedElements];
  [self startSharedTransition:sharedElements];
  return YES;
}

- (NSArray *)sortViewsByTags:(NSArray *)views
{
  /*
    All shared views during the transition have the same parent. It is problematic if parent
    view and their children are in the same transition. To keep the valid order in the z-axis,
    we need to sort views by tags. Parent tag is lower than children tags.
  */
  return [views sortedArrayUsingComparator:^NSComparisonResult(RCTUIView *view1, RCTUIView *view2) {
    return [view2.reactTag compare:view1.reactTag];
  }];
}

- (NSMutableArray<REASharedElement *> *)getSharedElementForCurrentTransition:(NSArray *)sharedViews
                                                             withNewElements:(BOOL)addedNewScreen
{
  NSMutableArray<RCTUIView *> *newTransitionViews = [NSMutableArray new];
  NSMutableArray<REASharedElement *> *sharedElements = [NSMutableArray new];
  NSMutableSet<NSNumber *> *currentSharedViewsTags = [NSMutableSet new];
  for (RCTUIView *sharedView in sharedViews) {
    [currentSharedViewsTags addObject:sharedView.reactTag];
  }
  for (RCTUIView *sharedView in sharedViews) {
    // add observers
    RCTUIView *sharedViewScreen = [REAScreensHelper getScreenForView:sharedView];
    RCTUIView *stack = [REAScreensHelper getStackForView:sharedViewScreen];

    // find sibling for shared view
    NSNumber *siblingViewTag = _findPrecedingViewTagForTransition(sharedView.reactTag);
    RCTUIView *siblingView = nil;
    do {
      siblingView = [_animationManager viewForTag:siblingViewTag];
      if (siblingView == nil) {
        [self clearAllSharedConfigsForViewTag:siblingViewTag];
        siblingViewTag = _findPrecedingViewTagForTransition(sharedView.reactTag);
      }
    } while (siblingView == nil && siblingViewTag != nil);

    if (siblingView == nil) {
      // the sibling of shared view doesn't exist yet
      continue;
    }

    RCTUIView *viewSource;
    RCTUIView *viewTarget;
    if (addedNewScreen) {
      viewSource = siblingView;
      viewTarget = sharedView;
    } else {
      viewSource = sharedView;
      viewTarget = siblingView;
    }

    bool isInCurrentTransition = false;
    if (_currentSharedTransitionViews[viewSource.reactTag] || _currentSharedTransitionViews[viewTarget.reactTag]) {
      isInCurrentTransition = true;
      if (addedNewScreen) {
        siblingViewTag = _findPrecedingViewTagForTransition(siblingView.reactTag);
        siblingView = [_animationManager viewForTag:siblingViewTag];

        viewSource = siblingView;
        viewTarget = sharedView;
      }
    }

    if ([currentSharedViewsTags containsObject:viewSource.reactTag] &&
        [currentSharedViewsTags containsObject:viewTarget.reactTag]) {
      continue;
    }

    bool isModal = [REAScreensHelper isScreenModal:sharedViewScreen];
    // check valid target screen configuration
    int screensCount = [stack.reactSubviews count];
    if (addedNewScreen && !isModal) {
      // is under top
      if (screensCount < 2) {
        continue;
      }
      RCTUIView *viewSourceParentScreen = [REAScreensHelper getScreenForView:viewSource];
      RCTUIView *screenUnderStackTop = stack.reactSubviews[screensCount - 2];
      if (![screenUnderStackTop.reactTag isEqual:viewSourceParentScreen.reactTag] && !isInCurrentTransition) {
        continue;
      }
    } else if (!addedNewScreen) {
      // is on top
      RCTUIView *viewTargetParentScreen = [REAScreensHelper getScreenForView:viewTarget];
      // TODO: get navigationController on macOS
#if !TARGET_OS_OSX
      RCTUIView *stackTarget = viewTargetParentScreen.reactViewController.navigationController.topViewController.view;
      if (stackTarget != viewTargetParentScreen) {
        continue;
      }
#endif
    }

    if (isModal) {
      [_viewsToHide addObject:viewSource.reactTag];
    }

    REASnapshot *sourceViewSnapshot = [[REASnapshot alloc] initWithAbsolutePosition:viewSource];
    if (addedNewScreen && !_currentSharedTransitionViews[viewSource.reactTag]) {
      _snapshotRegistry[viewSource.reactTag] = sourceViewSnapshot;
    }

    REASnapshot *targetViewSnapshot;
    if (addedNewScreen) {
      targetViewSnapshot = [[REASnapshot alloc] initWithAbsolutePosition:viewTarget];
      _snapshotRegistry[viewTarget.reactTag] = targetViewSnapshot;
    } else {
      targetViewSnapshot = _snapshotRegistry[viewTarget.reactTag];
      if (targetViewSnapshot == nil) {
        targetViewSnapshot = [[REASnapshot alloc] initWithAbsolutePosition:viewTarget];
      }
    }

    [newTransitionViews addObject:viewSource];
    [newTransitionViews addObject:viewTarget];

    REASharedElement *sharedElement = [[REASharedElement alloc] initWithSourceView:viewSource
                                                                sourceViewSnapshot:sourceViewSnapshot
                                                                        targetView:viewTarget
                                                                targetViewSnapshot:targetViewSnapshot];
    [sharedElements addObject:sharedElement];
  }
  if ([newTransitionViews count] > 0) {
    for (NSNumber *viewTag in _currentSharedTransitionViews) {
      RCTUIView *view = _currentSharedTransitionViews[viewTag];
      if ([newTransitionViews containsObject:view]) {
        [self disableCleaningForViewTag:viewTag];
      } else {
        [_viewsWithCanceledAnimation addObject:view];
      }
    }
    [_currentSharedTransitionViews removeAllObjects];
    for (RCTUIView *view in newTransitionViews) {
      _currentSharedTransitionViews[view.reactTag] = view;
    }
    for (RCTUIView *view in [_viewsWithCanceledAnimation copy]) {
      [self cancelAnimation:view.reactTag];
      [self finishSharedAnimation:view removeView:YES];
    }
  }
  if ([sharedElements count] != 0) {
    _sharedElements = sharedElements;
  }
  return sharedElements;
}

/*
  Method swizzling is used to get notification from react-native-screens
  about push or pop screen from stack.
*/
- (void)swizzleScreensMethods
{
#if LOAD_SCREENS_HEADERS
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    SEL viewDidLayoutSubviewsSelector = @selector(viewDidLayoutSubviews);
    SEL notifyWillDisappearSelector = @selector(notifyWillDisappear);
    Class screenClass = [RNSScreen class];
    Class screenViewClass = [RNSScreenView class];
    BOOL allSelectorsAreAvailable = [RNSScreen instancesRespondToSelector:viewDidLayoutSubviewsSelector] &&
        [RNSScreenView instancesRespondToSelector:notifyWillDisappearSelector];

    if (allSelectorsAreAvailable) {
      [REAUtils swizzleMethod:viewDidLayoutSubviewsSelector
                     forClass:screenClass
                         with:@selector(reanimated_viewDidLayoutSubviews)
                    fromClass:[self class]];
      [REAUtils swizzleMethod:notifyWillDisappearSelector
                     forClass:screenViewClass
                         with:@selector(reanimated_notifyWillDisappear)
                    fromClass:[self class]];
      _isConfigured = YES;
    }
  });
#endif
}

- (void)reanimated_viewDidLayoutSubviews
{
  // call original method from react-native-screens, self == RNScreen
  [self reanimated_viewDidLayoutSubviews];
  RCTUIView *screen = [self valueForKey:@"screenView"];
  [_sharedTransitionManager screenAddedToStack:screen];
}

- (void)reanimated_notifyWillDisappear
{
  // call original method from react-native-screens, self == RNSScreenView
  [self reanimated_notifyWillDisappear];
  [_sharedTransitionManager screenRemovedFromStack:(RCTUIView *)self];
}

- (void)screenAddedToStack:(RCTUIView *)screen
{
  if (screen.superview != nil) {
    [self runAsyncSharedTransition];
  }
}

- (void)screenRemovedFromStack:(RCTUIView *)screen
{
  _isStackDropped = NO;
  RCTUIView *stack = [REAScreensHelper getStackForView:screen];
  bool isModal = [REAScreensHelper isScreenModal:screen];
  bool isRemovedInParentStack = [self isRemovedFromHigherStack:screen];
  if ((stack != nil || isModal) && !isRemovedInParentStack) {
    bool isInteractive = [self isInteractiveScreenChange:screen];
    // screen is removed from React tree (navigation.navigate(<screenName>))
    bool isScreenRemovedFromReactTree = [self isScreen:screen outsideStack:stack];
    // click on button goBack on native header
    bool isTriggeredByGoBackButton = [self isScreen:screen onTopOfStack:stack];
    bool shouldRunTransition = (isScreenRemovedFromReactTree || isTriggeredByGoBackButton) &&
        !(isInteractive && [_currentSharedTransitionViews count] > 0);
    if (shouldRunTransition) {
      [self runSharedTransitionForSharedViewsOnScreen:screen isInteractive:isInteractive];
    } else {
      [self makeSnapshotForScreenViews:screen];
    }
    [self restoreViewsVisibility];
  } else {
    // removed stack
    if (![self isInteractiveScreenChange:screen]) {
      [self clearConfigForStackNow:stack];
    } else {
      _isStackDropped = YES;
    }
  }
}

- (bool)isInteractiveScreenChange:(RCTUIView *)screen
{
#if !TARGET_OS_OSX
  return screen.reactViewController.transitionCoordinator.interactive;
#else
  // TODO: get transitionCoordinator on macOS
  return false;
#endif
}

- (void)makeSnapshotForScreenViews:(RCTUIView *)screen
{
  REANodeFind(screen, ^int(id<RCTComponent> view) {
    NSNumber *viewTag = view.reactTag;
    if (self->_currentSharedTransitionViews[viewTag]) {
      return false;
    }
    if ([self->_animationManager hasAnimationForTag:viewTag type:SHARED_ELEMENT_TRANSITION]) {
      REASnapshot *snapshot = [[REASnapshot alloc] initWithAbsolutePosition:(RCTUIView *)view];
      self->_snapshotRegistry[viewTag] = snapshot;
    }
    return false;
  });
}

- (void)restoreViewsVisibility
{
  for (NSNumber *viewTag in _viewsToHide) {
    RCTUIView *view = [_animationManager viewForTag:viewTag];
    view.hidden = NO;
  }
  [_viewsToHide removeAllObjects];
}

- (void)clearConfigForStackNow:(RCTUIView *)stack
{
  for (RCTUIView *screen in stack.reactSubviews) {
    [self clearConfigForScreen:screen];
  }
}

- (BOOL)isScreen:(RCTUIView *)screen outsideStack:(RCTUIView *)stack
{
  for (RCTUIView *child in stack.reactSubviews) {
    if ([child.reactTag isEqual:screen.reactTag]) {
      return NO;
    }
  }
  return YES;
}

- (BOOL)isScreen:(RCTUIView *)screen onTopOfStack:(RCTUIView *)stack
{
  int screenCount = stack.reactSubviews.count;
  return screenCount > 0 && screen == stack.reactSubviews.lastObject;
}

- (BOOL)isRemovedFromHigherStack:(RCTUIView *)screen
{
  RCTUIView *stack = screen.reactSuperview;
  while (stack != nil) {
#if !TARGET_OS_OSX
    screen = stack.reactViewController.navigationController.topViewController.view;
#else
    // TODO: get navigationController on macOS
    screen = nil;
#endif
    if (screen == nil) {
      break;
    }
    if (screen.superview == nil) {
      return YES;
    }
    stack = screen.reactSuperview;
  }
  return NO;
}

- (void)runSharedTransitionForSharedViewsOnScreen:(RCTUIView *)screen isInteractive:(BOOL)isInteractive
{
  NSMutableArray<RCTUIView *> *removedViews = [NSMutableArray new];
  REANodeFind(screen, ^int(id<RCTComponent> view) {
    if ([self->_animationManager hasAnimationForTag:view.reactTag type:SHARED_ELEMENT_TRANSITION]) {
      [removedViews addObject:(RCTUIView *)view];
    }
    return false;
  });
  BOOL startedAnimation = [self configureAndStartSharedTransitionForViews:removedViews isInteractive:isInteractive];
  if (startedAnimation) {
    _removedViews = removedViews;
  } else if (![self isInteractiveScreenChange:screen]) {
    [self clearConfigForScreen:screen];
  } else {
    _clearScreen = YES;
  }
}

- (void)runAsyncSharedTransition
{
  if ([_sharedElements count] == 0 || !_isAsyncSharedTransitionConfigured) {
    return;
  }
  for (REASharedElement *sharedElement in _sharedElements) {
    RCTUIView *viewTarget = sharedElement.targetView;
    REASnapshot *targetViewSnapshot = [[REASnapshot alloc] initWithAbsolutePosition:viewTarget];
    _snapshotRegistry[viewTarget.reactTag] = targetViewSnapshot;
    sharedElement.targetViewSnapshot = targetViewSnapshot;
  }

  [self configureTransitionContainer];
  [self reparentSharedViewsForCurrentTransition:_sharedElements];
  [self startSharedTransition:_sharedElements];
  [_addedSharedViews removeAllObjects];
  _isAsyncSharedTransitionConfigured = NO;
}

- (void)configureTransitionContainer
{
  if (!_isSharedTransitionActive) {
    _isSharedTransitionActive = YES;
    RCTUIView *mainWindow = UIApplication.sharedApplication.keyWindow;
    if (_transitionContainer == nil) {
      _transitionContainer = [RCTUIView new];
    }
    [mainWindow addSubview:_transitionContainer];
    // TODO: bringSubviewToFront on macOS
#if !TARGET_OS_OSX
    [mainWindow bringSubviewToFront:_transitionContainer];
#endif
  }
}

- (void)reparentSharedViewsForCurrentTransition:(NSArray *)sharedElements
{
  for (REASharedElement *sharedElement in sharedElements) {
    RCTUIView *viewSource = sharedElement.sourceView;
    RCTUIView *viewTarget = sharedElement.targetView;
    if (_sharedTransitionParent[viewSource.reactTag] == nil) {
      _sharedTransitionParent[viewSource.reactTag] = viewSource.superview;
      _sharedTransitionInParentIndex[viewSource.reactTag] = @([viewSource.superview.subviews indexOfObject:viewSource]);
      [viewSource removeFromSuperview];
      [_transitionContainer addSubview:viewSource];
    }

    if (_sharedTransitionParent[viewTarget.reactTag] == nil) {
      _sharedTransitionParent[viewTarget.reactTag] = viewTarget.superview;
      _sharedTransitionInParentIndex[viewTarget.reactTag] = @([viewTarget.superview.subviews indexOfObject:viewTarget]);
      [viewTarget removeFromSuperview];
      [_transitionContainer addSubview:viewTarget];
    }
  }
}

- (void)startSharedTransition:(NSArray *)sharedElements
{
  for (REASharedElement *sharedElement in sharedElements) {
    LayoutAnimationType type = sharedElement.animationType;
    [self onViewTransition:sharedElement.sourceView
                    before:sharedElement.sourceViewSnapshot
                     after:sharedElement.targetViewSnapshot
                      type:type];
    [self onViewTransition:sharedElement.targetView
                    before:sharedElement.sourceViewSnapshot
                     after:sharedElement.targetViewSnapshot
                      type:type];
  }
}

- (void)onViewTransition:(RCTUIView *)view
                  before:(REASnapshot *)before
                   after:(REASnapshot *)after
                    type:(LayoutAnimationType)type
{
  NSMutableDictionary *targetValues = after.values;
  NSMutableDictionary *currentValues = before.values;
  // TODO: bringSubviewToFront on macOS
#if !TARGET_OS_OSX
  [view.superview bringSubviewToFront:view];
#endif
  NSDictionary *preparedValues = [self prepareDataForWorklet:currentValues targetValues:targetValues];
  [_animationManager startAnimationForTag:view.reactTag type:type yogaValues:preparedValues];
}

- (void)finishSharedAnimation:(RCTUIView *)view removeView:(BOOL)removeView
{
  if (!_isConfigured) {
    return;
  }
  NSNumber *viewTag = view.reactTag;
  if (_disableCleaningForView[viewTag]) {
    [self enableCleaningForViewTag:viewTag];
    return;
  }
  if (_currentSharedTransitionViews[viewTag] || [_viewsWithCanceledAnimation containsObject:view]) {
    [view removeFromSuperview];
    RCTUIView *parent = _sharedTransitionParent[viewTag];
    int childIndex = [_sharedTransitionInParentIndex[viewTag] intValue];
    RCTUIView *screen = [REAScreensHelper getScreenForView:parent];
    bool isScreenInReactTree = screen.reactSuperview != nil;
    if (isScreenInReactTree) {
      [parent insertSubview:view atIndex:childIndex];
      REASnapshot *viewSourcePreviousSnapshot = _snapshotRegistry[viewTag];
      [_animationManager progressLayoutAnimationWithStyle:viewSourcePreviousSnapshot.values
                                                   forTag:viewTag
                                       isSharedTransition:YES];
      float originXByParent = [viewSourcePreviousSnapshot.values[@"originXByParent"] floatValue];
      float originYByParent = [viewSourcePreviousSnapshot.values[@"originYByParent"] floatValue];
      CGRect frame = CGRectMake(originXByParent, originYByParent, view.frame.size.width, view.frame.size.height);
      [view setFrame:frame];
    }
    if ([_viewsToHide containsObject:viewTag]) {
      view.hidden = YES;
    }
    [_currentSharedTransitionViews removeObjectForKey:viewTag];
    [_sharedTransitionParent removeObjectForKey:viewTag];
    [_sharedTransitionInParentIndex removeObjectForKey:viewTag];
    [_viewsWithCanceledAnimation removeObject:view];
    if (!removeView) {
      [_removedViews removeObject:view];
    }
    if ([_removedViews containsObject:view]) {
      [_animationManager clearAnimationConfigForTag:viewTag];
    }
  }
  if ([_currentSharedTransitionViews count] == 0) {
    [_transitionContainer removeFromSuperview];
    [_removedViews removeAllObjects];
    [_sharedElements removeAllObjects];
    _isSharedTransitionActive = NO;
  }
}

- (void)setFindPrecedingViewTagForTransitionBlock:
    (REAFindPrecedingViewTagForTransitionBlock)findPrecedingViewTagForTransition
{
  _findPrecedingViewTagForTransition = findPrecedingViewTagForTransition;
}

- (void)setCancelAnimationBlock:(REACancelAnimationBlock)cancelAnimationBlock
{
  _cancelLayoutAnimation = cancelAnimationBlock;
}

- (void)clearAllSharedConfigsForViewTag:(NSNumber *)viewTag
{
  if (viewTag != nil) {
    [_snapshotRegistry removeObjectForKey:viewTag];
    [_animationManager clearAnimationConfigForTag:viewTag];
  }
}

- (void)cancelAnimation:(NSNumber *)viewTag
{
  _cancelLayoutAnimation(viewTag);
}

- (void)disableCleaningForViewTag:(NSNumber *)viewTag
{
  NSNumber *counter = _disableCleaningForView[viewTag];
  if (counter != nil) {
    _disableCleaningForView[viewTag] = @([counter intValue] + 1);
  } else {
    _disableCleaningForView[viewTag] = @(1);
  }
}

- (void)enableCleaningForViewTag:(NSNumber *)viewTag
{
  NSNumber *counter = _disableCleaningForView[viewTag];
  if (counter == nil) {
    return;
  }
  int counterInt = [counter intValue];
  if (counterInt == 1) {
    [_disableCleaningForView removeObjectForKey:viewTag];
  } else {
    _disableCleaningForView[viewTag] = @(counterInt - 1);
  }
}

- (void)resolveAnimationType:(NSArray<REASharedElement *> *)sharedElements isInteractive:(BOOL)isInteractive
{
  for (REASharedElement *sharedElement in sharedElements) {
    NSNumber *viewTag = sharedElement.sourceView.reactTag;
    bool viewHasProgressAnimation = [self->_animationManager hasAnimationForTag:viewTag
                                                                           type:SHARED_ELEMENT_TRANSITION_PROGRESS];
    if (viewHasProgressAnimation || isInteractive) {
      sharedElement.animationType = SHARED_ELEMENT_TRANSITION_PROGRESS;
    } else {
      sharedElement.animationType = SHARED_ELEMENT_TRANSITION;
    }
  }
}

- (NSDictionary *)prepareDataForWorklet:(NSMutableDictionary *)currentValues
                           targetValues:(NSMutableDictionary *)targetValues
{
  NSMutableDictionary *workletValues = [_animationManager prepareDataForLayoutAnimatingWorklet:currentValues
                                                                                  targetValues:targetValues];
  workletValues[@"currentTransformMatrix"] = currentValues[@"transformMatrix"];
  workletValues[@"targetTransformMatrix"] = targetValues[@"transformMatrix"];
  workletValues[@"currentBorderRadius"] = currentValues[@"borderRadius"];
  workletValues[@"targetBorderRadius"] = targetValues[@"borderRadius"];
  return workletValues;
}

- (void)onScreenRemoval:(RCTUIView *)screen stack:(RCTUIView *)stack
{
  if (_isStackDropped && screen != nil) {
    // to clear config from stack after swipe back
    [self clearConfigForStackNow:stack];
    _isStackDropped = NO;
  } else if (_clearScreen) {
    // to clear config from screen after swipe back
    [self clearConfigForScreen:screen];
    _clearScreen = NO;
  }
}

- (void)clearConfigForScreen:(RCTUIView *)screen
{
  REANodeFind(screen, ^int(id<RCTComponent> _Nonnull view) {
    [self clearAllSharedConfigsForViewTag:view.reactTag];
    return false;
  });
}

@end
