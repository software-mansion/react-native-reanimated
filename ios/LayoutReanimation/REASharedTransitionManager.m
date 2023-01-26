#import <RNReanimated/REASharedElement.h>
#import <RNReanimated/REASharedTransitionManager.h>
#import <objc/runtime.h>

#if __has_include(<RNScreens/RNSScreen.h>)
#import <RNScreens/RNSScreen.h>
#import <RNScreens/RNSScreenStack.h>
#endif

@implementation REASharedTransitionManager {
  NSMutableDictionary<NSNumber *, UIView *> *_sharedTransitionParent;
  NSMutableDictionary<NSNumber *, NSNumber *> *_sharedTransitionInParentIndex;
  NSMutableDictionary<NSNumber *, REASnapshot *> *_snapshotRegistry;
  NSMutableDictionary<NSNumber *, UIView *> *_currentSharedTransitionViews;
  REAFindSiblingForSharedViewBlock _findSiblingForSharedView;
  UIView *_transitionContainer;
  NSMutableArray<UIView *> *_addedSharedViews;
  BOOL _isSharedTransitionActive;
  NSMutableArray<REASharedElement *> *_sharedElements;
  REAAnimationsManager *_animationManager;
  NSMutableSet<NSNumber *> *_screenHasObserver;
}

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
    _screenHasObserver = [NSMutableSet new];
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
  [self setupAsyncSharedTransitionForViews:_addedSharedViews];
  [_addedSharedViews removeAllObjects];
}

- (void)setupAsyncSharedTransitionForViews:(NSArray<UIView *> *)views
{
  NSArray *sharedViews = [self sortViewsByTags:views];
  _sharedElements = [self getSharedElementForCurrentTransition:sharedViews withNewElements:YES];
}

- (BOOL)setupSyncSharedTransitionForViews:(NSArray<UIView *> *)views
{
  NSArray *sharedViews = [self sortViewsByTags:views];
  NSArray<REASharedElement *> *sharedElements = [self getSharedElementForCurrentTransition:sharedViews
                                                                           withNewElements:NO];
  if ([sharedElements count] == 0) {
    return NO;
  }
  [self setupTransitionContainer];
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
    if (addedNewScreen) {
      [self observeChanges:sharedViewScreen];
    }

    // find sibling for shared view
    NSNumber *siblingViewTag = _findSiblingForSharedView(sharedView.reactTag);
    UIView *siblingView = nil;
    do {
      siblingView = [_animationManager viewForTag:siblingViewTag];
      if (siblingView == nil) {
        [self clearAllSharedConfigsForViewTag:siblingViewTag];
        siblingViewTag = _findSiblingForSharedView(sharedView.reactTag);
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
    if (maybeParentScreen) {
      NSNumber *presentationMode = [maybeParentScreen valueForKey:@"stackPresentation"];
      isModal = ![presentationMode isEqual:@(0)];
    }

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

    REASnapshot *sourceViewSnapshot = [[REASnapshot alloc] init:viewSource withParent:viewSource.superview];
    _snapshotRegistry[viewSource.reactTag] = sourceViewSnapshot;

    REASnapshot *targetViewSnapshot;
    if (addedNewScreen) {
      targetViewSnapshot = [[REASnapshot alloc] init:viewTarget withParent:viewTarget.superview];
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
#if __has_include(<RNScreens/RNSScreen.h>)
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
#if __has_include(<RNScreens/RNSScreen.h>)
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

- (void)observeChanges:(UIView *)view
{
  if ([_screenHasObserver containsObject:view.reactTag]) {
    return;
  }
  [_screenHasObserver addObject:view.reactTag];

  [view addObserver:self forKeyPath:@"transitionDuration" options:NSKeyValueObservingOptionNew context:nil];
  [view addObserver:self forKeyPath:@"activityState" options:NSKeyValueObservingOptionNew context:nil];

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    // it replaces method for RNSScreenView class, so it can be done only once
    UIViewController *viewController = [view valueForKey:@"controller"];
    [self swizzleMethod:@selector(viewDidLayoutSubviews)
                   with:@selector(swizzled_viewDidLayoutSubviews)
               forClass:[viewController class]];
    [self swizzleMethod:@selector(notifyWillDisappear)
                   with:@selector(swizzled_notifyWillDisappear)
               forClass:[view class]];
  });
}

- (void)swizzleMethod:(SEL)originalSelector with:(SEL)swizzledSelector forClass:(Class)originalClass
{
  Class class = [self class];
  Method originalMethod = class_getInstanceMethod(originalClass, originalSelector);
  Method swizzledMethod = class_getInstanceMethod(class, swizzledSelector);
  IMP originalImp = method_getImplementation(originalMethod);
  IMP swizzledImp = method_getImplementation(swizzledMethod);
  class_replaceMethod(originalClass, swizzledSelector, originalImp, method_getTypeEncoding(originalMethod));
  class_replaceMethod(originalClass, originalSelector, swizzledImp, method_getTypeEncoding(swizzledSelector));
}

- (void)swizzled_viewDidLayoutSubviews
{
  /*
    The screen header is added later than other screen children and changes their
    position on the screen. That's why we need to make a snapshot after the header
    mount. We don't want to add a strong dependency to the react-native-screens
    library so we decided to use KVO from Obj-C. However, all properties of the
    screen are updated without calling Obj-C's setters. We swizzled the method
    `viewDidLayoutSubviews` - this method is called after the appearance of the header.
    Then we call KVO to notify Reanimated observer about the attached header.
  */

  // call original method from react-native-screens, self == RNScreen
  [self swizzled_viewDidLayoutSubviews];
  // get RNScreenView from RNScreen to call KVO on RNScreenView because
  // RNScreen doesn't contains writable public property.
  UIView *view = [self valueForKey:@"screenView"];
  // call KVO to run runAsyncSharedTransition from Reanimated
  [view setValue:[view valueForKey:@"transitionDuration"] forKey:@"transitionDuration"];
}

- (void)swizzled_notifyWillDisappear
{
  // call original method from react-native-screens, self == RNScreenView
  [self swizzled_notifyWillDisappear];
  // call KVO to run runAsyncSharedTransition from Reanimated
  [self setValue:[self valueForKey:@"activityState"] forKey:@"activityState"];
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary<NSKeyValueChangeKey, id> *)change
                       context:(void *)context
{
  UIView *screen = (UIView *)object;
  UIView *stack = [self getStackForView:screen];

  if ([keyPath isEqualToString:@"transitionDuration"]) {
    // added new screen (push)
    if (screen.superview != nil) {
      [self runAsyncSharedTransition];
    }
  } else if ([keyPath isEqualToString:@"activityState"]) {
    // removed screen from top (removed from stack or covered by another screen)
    bool isRemovedInParentStack = [self isRemovedFromHigherStack:screen];
    if (stack != nil && !isRemovedInParentStack) {
      bool shouldRunTransition =
          [self isScreen:screen
              outsideStack:stack] // screen is removed from React tree (navigation.navigate(<screenName>))
          || [self isScreen:screen onTopOfStack:stack]; // click on button goBack on native header
      if (shouldRunTransition) {
        [self runSharedTransitionForSharedViewsOnScreen:screen];
      } else {
        [self doSnapshotForScreenViews:screen];
      }
    } else {
      // removed stack
      [self clearConfigForStack:stack];
    }
  }
}

- (void)doSnapshotForScreenViews:(UIView *)screen
{
  [_animationManager visitTree:screen
                         block:^int(id<RCTComponent> view) {
                           NSNumber *viewTag = view.reactTag;
                           if ([self->_animationManager hasAnimationForTag:viewTag type:@"sharedElementTransition"]) {
                             REASnapshot *snapshot = [[REASnapshot alloc] init:(UIView *)view
                                                                    withParent:((UIView *)view).superview];
                             self->_snapshotRegistry[viewTag] = snapshot;
                           }
                           return false;
                         }];
}

- (void)clearConfigForStack:(UIView *)stack
{
  for (UIView *child in stack.reactSubviews) {
    [_animationManager visitTree:child
                           block:^int(id<RCTComponent> _Nonnull view) {
                             [self clearAllSharedConfigsForViewTag:view.reactTag];
                             return false;
                           }];
    [_screenHasObserver removeObject:child.reactTag];
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
  [_animationManager visitTree:screen
                         block:^int(id<RCTComponent> view) {
                           if ([self->_animationManager hasAnimationForTag:view.reactTag
                                                                      type:@"sharedElementTransition"]) {
                             [removedViews addObject:(UIView *)view];
                           }
                           return false;
                         }];
  BOOL startedAnimation = [self setupSyncSharedTransitionForViews:removedViews];
  if (startedAnimation) {
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
    REASnapshot *targetViewSnapshot = [[REASnapshot alloc] init:viewTarget withParent:viewTarget.superview];
    _snapshotRegistry[viewTarget.reactTag] = targetViewSnapshot;
    sharedElement.targetViewSnapshot = targetViewSnapshot;
    [currentSharedElements addObject:sharedElement];
  }

  if ([currentSharedElements count] == 0) {
    return;
  }
  [self setupTransitionContainer];
  [self reparentSharedViewsForCurrentTransition:_sharedElements];
  [self startSharedTransition:_sharedElements];
  [_addedSharedViews removeAllObjects];
  [_sharedElements removeObjectsInArray:currentSharedElements];
}

- (void)setupTransitionContainer
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
      viewSourcePreviousSnapshot.values[@"originY"] = viewSourcePreviousSnapshot.values[@"originYByParent"];
    }
    [_animationManager progressLayoutAnimationWithStyle:viewSourcePreviousSnapshot.values
                                                 forTag:view.reactTag
                                     isSharedTransition:YES];
    viewSourcePreviousSnapshot.values[@"originY"] = originY;
    [_currentSharedTransitionViews removeObjectForKey:view.reactTag];
  }
  if ([_currentSharedTransitionViews count] == 0) {
    [_sharedTransitionParent removeAllObjects];
    [_sharedTransitionInParentIndex removeAllObjects];
    [_transitionContainer removeFromSuperview];
    _isSharedTransitionActive = NO;
  }
}

- (void)setFindSiblingForSharedViewBlock:(REAFindSiblingForSharedViewBlock)findSiblingForSharedView
{
  _findSiblingForSharedView = findSiblingForSharedView;
}

- (void)clearAllSharedConfigsForViewTag:(NSNumber *)viewTag
{
  if (viewTag != nil) {
    [_snapshotRegistry removeObjectForKey:viewTag];
    [_animationManager clearAnimationConfigForTag:viewTag];
  }
}

@end
