#import <RNReanimated/REASharedElement.h>
#import <RNReanimated/REASharedTransitionManager.h>
#import <objc/runtime.h>

#define LOAD_SCREENS_HEADERS ((!RCT_NEW_ARCH_ENABLED && __has_include(<RNScreens/RNSScreen.h>)) || (RCT_NEW_ARCH_ENABLED && __has_include(<RNScreens/RNSScreen.h>) && __cplusplus))

#if LOAD_SCREENS_HEADERS
#import <RNScreens/RNSScreen.h>
#import <RNScreens/RNSScreenStack.h>
#endif

@implementation REASharedTransitionManager {
  NSMutableDictionary<NSNumber *, UIView *> *_sharedTransitionParent;
  NSMutableDictionary<NSNumber *, NSNumber *> *_sharedTransitionInParentIndex;
  NSMutableDictionary<NSNumber *, REASnapshot *> *_snapshotRegistry;
  NSMutableDictionary<NSNumber *, UIView *> *_currentSharedTransitionViews;
  REAFindPrecedingViewTagForTransitionBlock _findPrecedingViewTagForTransition;
  UIView *_transitionContainer;
  NSMutableArray<UIView *> *_addedSharedViews;
  BOOL _isSharedTransitionActive;
  NSMutableArray<REASharedElement *> *_sharedElements;
  REAAnimationsManager *_animationManager;
  NSMutableSet<NSNumber *> *_shouldBeHidden;
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
    _shouldBeHidden = [NSMutableSet new];
    _sharedTransitionManager = self;
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

- (UIView *)getTransitioningView:(NSNumber *)tag
{
  return _currentSharedTransitionViews[tag];
}

- (void)notifyAboutNewView:(UIView *)view
{
  [_addedSharedViews addObject:view];
}

- (void)viewsDidLayout
{
  [self configureAsyncSharedTransitionForViews:_addedSharedViews];
  [_addedSharedViews removeAllObjects];
}

- (void)configureAsyncSharedTransitionForViews:(NSArray<UIView *> *)views
{
  if ([views count] > 0) {
    NSArray *sharedViews = [self sortViewsByTags:views];
    _sharedElements = [self getSharedElementForCurrentTransition:sharedViews withNewElements:YES];
  }
}

- (BOOL)configureAndStartSharedTransitionForViews:(NSArray<UIView *> *)views
{
  NSArray *sharedViews = [self sortViewsByTags:views];
  NSArray<REASharedElement *> *sharedElements = [self getSharedElementForCurrentTransition:sharedViews
                                                                           withNewElements:NO];
  if ([sharedElements count] == 0) {
    return NO;
  }
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
  return [views sortedArrayUsingComparator:^NSComparisonResult(UIView *view1, UIView *view2) {
    return [view2.reactTag compare:view1.reactTag];
  }];
}

- (NSMutableArray<REASharedElement *> *)getSharedElementForCurrentTransition:(NSArray *)sharedViews
                                                             withNewElements:(BOOL)addedNewScreen
{
  NSMutableArray<REASharedElement *> *sharedElements = [NSMutableArray new];
  for (UIView *sharedView in sharedViews) {
    // add observers
    UIView *sharedViewScreen = [self getScreenForView:sharedView];
    UIView *stack = [self getStackForView:sharedViewScreen];

    // find sibling for shared view
    NSNumber *siblingViewTag = _findPrecedingViewTagForTransition(sharedView.reactTag);
    UIView *siblingView = nil;
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

    UIView *viewSource;
    UIView *viewTarget;
    if (addedNewScreen) {
      viewSource = siblingView;
      viewTarget = sharedView;
    } else {
      viewSource = sharedView;
      viewTarget = siblingView;
    }

    UIView *maybeParentScreen = stack.superview;
    bool isModal = false;
#if __has_include(<RNScreens/RNSScreen.h>)
    if ([maybeParentScreen isKindOfClass:[RNSScreenView class]]) {
      NSNumber *presentationMode = [maybeParentScreen valueForKey:@"stackPresentation"];
      isModal = ![presentationMode isEqual:@(0)];
    }
#endif

    // check valid target screen configuration
    int screensCount = [stack.reactSubviews count];
    if (addedNewScreen && !isModal) {
      // is under top
      if (screensCount < 2) {
        continue;
      }
      UIView *viewSourceParentScreen = [self getScreenForView:viewSource];
      UIView *screenUnderStackTop = stack.reactSubviews[screensCount - 2];
      if (![screenUnderStackTop.reactTag isEqual:viewSourceParentScreen.reactTag]) {
        continue;
      }
    } else if (!addedNewScreen) {
      // is on top
      UIView *viewTargetParentScreen = [self getScreenForView:viewTarget];
      UIView *stackTarget = viewTargetParentScreen.reactViewController.navigationController.topViewController.view;
      if (stackTarget != viewTargetParentScreen) {
        continue;
      }
    }

    if (isModal) {
      [_shouldBeHidden addObject:viewSource.reactTag];
    }

    REASnapshot *sourceViewSnapshot = [[REASnapshot alloc] initWithAbsolutePosition:viewSource];
    _snapshotRegistry[viewSource.reactTag] = sourceViewSnapshot;

    REASnapshot *targetViewSnapshot;
    if (addedNewScreen) {
      targetViewSnapshot = [[REASnapshot alloc] initWithAbsolutePosition:viewTarget];
      _snapshotRegistry[viewTarget.reactTag] = targetViewSnapshot;
    } else {
      targetViewSnapshot = _snapshotRegistry[viewTarget.reactTag];
    }

    if (!_currentSharedTransitionViews[viewSource.reactTag]) {
      _currentSharedTransitionViews[viewSource.reactTag] = viewSource;
    }
    if (!_currentSharedTransitionViews[viewTarget.reactTag]) {
      _currentSharedTransitionViews[viewTarget.reactTag] = viewTarget;
    }

    REASharedElement *sharedElement = [[REASharedElement alloc] initWithSourceView:viewSource
                                                                sourceViewSnapshot:sourceViewSnapshot
                                                                        targetView:viewTarget
                                                                targetViewSnapshot:targetViewSnapshot];
    [sharedElements addObject:sharedElement];
  }
  return sharedElements;
}

- (UIView *)getScreenForView:(UIView *)view
{
#if LOAD_SCREENS_HEADERS
  UIView *screen = view;
  while (![screen isKindOfClass:[RNSScreenView class]] && screen.superview != nil) {
    screen = screen.superview;
  }
  if ([screen isKindOfClass:[RNSScreenView class]]) {
    return screen;
  }
#endif
  return nil;
}

- (UIView *)getStackForView:(UIView *)view
{
#if LOAD_SCREENS_HEADERS
  if ([view isKindOfClass:[RNSScreenView class]]) {
    if (view.reactSuperview != nil) {
      if ([view.reactSuperview isKindOfClass:[RNSScreenStackView class]]) {
        return view.reactSuperview;
      }
    }
  }
  while (view != nil && ![view isKindOfClass:[RNSScreenStackView class]] && view.superview != nil) {
    view = view.superview;
  }
  if ([view isKindOfClass:[RNSScreenStackView class]]) {
    return view;
  }
#endif
  return nil;
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
    // it replaces method for RNSScreenView class, so it can be done only once
    [self swizzleMethod:@selector(viewDidLayoutSubviews)
                   with:@selector(swizzled_viewDidLayoutSubviews)
               forClass:[RNSScreen class]];
    [self swizzleMethod:@selector(notifyWillDisappear)
                   with:@selector(swizzled_notifyWillDisappear)
               forClass:[RNSScreenView class]];
  });
#endif
}

- (void)swizzleMethod:(SEL)originalSelector with:(SEL)swizzledSelector forClass:(Class)originalClass
{
  Class class = [self class];
  Method originalMethod = class_getInstanceMethod(originalClass, originalSelector);
  Method swizzledMethod = class_getInstanceMethod(class, swizzledSelector);
  IMP originalImp = method_getImplementation(originalMethod);
  IMP swizzledImp = method_getImplementation(swizzledMethod);
  class_replaceMethod(originalClass, swizzledSelector, originalImp, method_getTypeEncoding(originalMethod));
  class_replaceMethod(originalClass, originalSelector, swizzledImp, method_getTypeEncoding(swizzledMethod));
}

- (void)swizzled_viewDidLayoutSubviews
{
  // call original method from react-native-screens, self == RNScreen
  [self swizzled_viewDidLayoutSubviews];
  UIView *screen = [self valueForKey:@"screenView"];
  [_sharedTransitionManager screenAddedToStack:screen];
}

- (void)swizzled_notifyWillDisappear
{
  // call original method from react-native-screens, self == RNSScreenView
  [self swizzled_notifyWillDisappear];
  [_sharedTransitionManager screenRemovedFromStack:(UIView *)self];
}

- (void)screenAddedToStack:(UIView *)screen
{
  if (screen.superview != nil) {
    [self runAsyncSharedTransition];
  }
}

- (void)screenRemovedFromStack:(UIView *)screen
{
  UIView *stack = [self getStackForView:screen];
  bool isRemovedInParentStack = [self isRemovedFromHigherStack:screen];
  if (stack != nil && !isRemovedInParentStack) {
    bool isInteractive =
        [[[screen.reactViewController valueForKey:@"transitionCoordinator"] valueForKey:@"interactive"] boolValue];
    // screen is removed from React tree (navigation.navigate(<screenName>))
    bool isScreenRemovedFromReactTree = [self isScreen:screen outsideStack:stack];
    // click on button goBack on native header
    bool isTriggeredByGoBackButton = [self isScreen:screen onTopOfStack:stack];
    bool shouldRunTransition = !isInteractive && (isScreenRemovedFromReactTree || isTriggeredByGoBackButton);
    if (shouldRunTransition) {
      [self runSharedTransitionForSharedViewsOnScreen:screen];
    } else {
      [self makeSnapshotForScreenViews:screen];
    }
    [self restoreViewsVisibility];
  } else {
    // removed stack
    [self clearConfigForStack:stack];
  }
}

- (void)makeSnapshotForScreenViews:(UIView *)screen
{
  REANodeFind(screen, ^int(id<RCTComponent> view) {
    NSNumber *viewTag = view.reactTag;
    if ([self->_animationManager hasAnimationForTag:viewTag type:@"sharedElementTransition"]) {
      REASnapshot *snapshot = [[REASnapshot alloc] initWithAbsolutePosition:(UIView *)view];
      self->_snapshotRegistry[viewTag] = snapshot;
    }
    return false;
  });
}

- (void)restoreViewsVisibility
{
  for (NSNumber *viewTag in _shouldBeHidden) {
    UIView *view = [_animationManager viewForTag:viewTag];
    view.hidden = NO;
  }
  [_shouldBeHidden removeAllObjects];
}

- (void)clearConfigForStack:(UIView *)stack
{
  for (UIView *child in stack.reactSubviews) {
    REANodeFind(child, ^int(id<RCTComponent> _Nonnull view) {
      [self clearAllSharedConfigsForViewTag:view.reactTag];
      return false;
    });
  }
}

- (BOOL)isScreen:(UIView *)screen outsideStack:(UIView *)stack
{
  for (UIView *child in stack.reactSubviews) {
    if ([child.reactTag isEqual:screen.reactTag]) {
      return NO;
    }
  }
  return YES;
}

- (BOOL)isScreen:(UIView *)screen onTopOfStack:(UIView *)stack
{
  int screenCount = stack.reactSubviews.count;
  return screenCount > 0 && screen == stack.reactSubviews.lastObject;
}

- (BOOL)isRemovedFromHigherStack:(UIView *)screen
{
  UIView *stack = screen.reactSuperview;
  while (stack != nil) {
    screen = stack.reactViewController.navigationController.topViewController.view;
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

- (void)runSharedTransitionForSharedViewsOnScreen:(UIView *)screen
{
  NSMutableArray<UIView *> *removedViews = [NSMutableArray new];
  REANodeFind(screen, ^int(id<RCTComponent> view) {
    if ([self->_animationManager hasAnimationForTag:view.reactTag type:@"sharedElementTransition"]) {
      [removedViews addObject:(UIView *)view];
    }
    return false;
  });
  BOOL animationStarted = [self configureAndStartSharedTransitionForViews:removedViews];
  if (animationStarted) {
    for (UIView *view in removedViews) {
      [_animationManager clearAnimationConfigForTag:view.reactTag];
    }
  }
}

- (void)runAsyncSharedTransition
{
  if ([_sharedElements count] == 0) {
    return;
  }
  NSMutableArray<REASharedElement *> *currentSharedElements = [NSMutableArray new];
  for (REASharedElement *sharedElement in _sharedElements) {
    UIView *viewTarget = sharedElement.targetView;
    REASnapshot *targetViewSnapshot = [[REASnapshot alloc] initWithAbsolutePosition:viewTarget];
    _snapshotRegistry[viewTarget.reactTag] = targetViewSnapshot;
    sharedElement.targetViewSnapshot = targetViewSnapshot;
    [currentSharedElements addObject:sharedElement];
  }

  if ([currentSharedElements count] == 0) {
    return;
  }
  [self configureTransitionContainer];
  [self reparentSharedViewsForCurrentTransition:_sharedElements];
  [self startSharedTransition:_sharedElements];
  [_addedSharedViews removeAllObjects];
  [_sharedElements removeObjectsInArray:currentSharedElements];
}

- (void)configureTransitionContainer
{
  if (!_isSharedTransitionActive) {
    _isSharedTransitionActive = YES;
    UIView *mainWindow = UIApplication.sharedApplication.keyWindow;
    if (_transitionContainer == nil) {
      _transitionContainer = [UIView new];
    }
    [mainWindow addSubview:_transitionContainer];
    [mainWindow bringSubviewToFront:_transitionContainer];
  }
}

- (void)reparentSharedViewsForCurrentTransition:(NSArray *)sharedElements
{
  for (REASharedElement *sharedElement in sharedElements) {
    UIView *viewSource = sharedElement.sourceView;
    UIView *viewTarget = sharedElement.targetView;
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
    [self onViewTransition:sharedElement.sourceView
                    before:sharedElement.sourceViewSnapshot
                     after:sharedElement.targetViewSnapshot];
    [self onViewTransition:sharedElement.targetView
                    before:sharedElement.sourceViewSnapshot
                     after:sharedElement.targetViewSnapshot];
  }
}

- (void)onViewTransition:(UIView *)view before:(REASnapshot *)before after:(REASnapshot *)after
{
  NSMutableDictionary *targetValues = after.values;
  NSMutableDictionary *currentValues = before.values;
  [view.superview bringSubviewToFront:view];
  NSDictionary *preparedValues = [_animationManager prepareDataForLayoutAnimatingWorklet:currentValues
                                                                            targetValues:targetValues];
  [_animationManager startAnimationForTag:view.reactTag
                                     type:@"sharedElementTransition"
                               yogaValues:preparedValues
                                    depth:@(0)];
}

- (void)finishSharedAnimation:(UIView *)view
{
  if (_currentSharedTransitionViews[view.reactTag]) {
    [view removeFromSuperview];
    UIView *parent = _sharedTransitionParent[view.reactTag];
    int childIndex = [_sharedTransitionInParentIndex[view.reactTag] intValue];
    [parent insertSubview:view atIndex:childIndex];
    REASnapshot *viewSourcePreviousSnapshot = _snapshotRegistry[view.reactTag];
    BOOL isScreenDetached = [self getScreenForView:view].superview == nil;
    NSNumber *originY = viewSourcePreviousSnapshot.values[@"originY"];
    if (isScreenDetached) {
      float originYByParent = [viewSourcePreviousSnapshot.values[@"originYByParent"] floatValue];
      float headerHeight = [viewSourcePreviousSnapshot.values[@"headerHeight"] floatValue];
      viewSourcePreviousSnapshot.values[@"originY"] = @(originYByParent + headerHeight);
    }
    [_animationManager progressLayoutAnimationWithStyle:viewSourcePreviousSnapshot.values
                                                 forTag:view.reactTag
                                     isSharedTransition:YES];
    viewSourcePreviousSnapshot.values[@"originY"] = originY;
    if ([_shouldBeHidden containsObject:viewTag]) {
      view.hidden = YES;
    }
    [_currentSharedTransitionViews removeObjectForKey:view.reactTag];
  }
  if ([_currentSharedTransitionViews count] == 0) {
    [_sharedTransitionParent removeAllObjects];
    [_sharedTransitionInParentIndex removeAllObjects];
    [_transitionContainer removeFromSuperview];
    _isSharedTransitionActive = NO;
  }
}

- (void)setFindPrecedingViewTagForTransitionBlock:
    (REAFindPrecedingViewTagForTransitionBlock)findPrecedingViewTagForTransition
{
  _findPrecedingViewTagForTransition = findPrecedingViewTagForTransition;
}

- (void)clearAllSharedConfigsForViewTag:(NSNumber *)viewTag
{
  if (viewTag != nil) {
    [_snapshotRegistry removeObjectForKey:viewTag];
    [_animationManager clearAnimationConfigForTag:viewTag];
  }
}

@end
