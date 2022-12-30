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
  NSMutableArray<UIView *> *_currentSharedTransitionViews;
  REAFindTheOtherForSharedTransitionBlock _findTheOtherForSharedTransition;
  UIView *_transitionContainer;
  NSMutableArray<UIView *> *_addedSharedViews;
  BOOL _isSharedTransitionActive;
  NSMutableArray<REASharedElement *> *_sharedElements;
  REAAnimationsManager *_animationManager;
  NSMutableSet<NSNumber *> *_stackDetectedChange;
  NSMutableSet<NSNumber *> *_stackHasObserver;
}

- (instancetype)initWithAnimationsManager:(REAAnimationsManager *)animationManager
{
  if (self = [super init]) {
    _snapshotRegistry = [NSMutableDictionary new];
    _currentSharedTransitionViews = [NSMutableArray new];
    _addedSharedViews = [NSMutableArray new];
    _sharedTransitionParent = [NSMutableDictionary new];
    _sharedTransitionInParentIndex = [NSMutableDictionary new];
    _isSharedTransitionActive = NO;
    _sharedElements = [NSMutableArray new];
    _animationManager = animationManager;
    _stackDetectedChange = [NSMutableSet new];
    _stackHasObserver = [NSMutableSet new];
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

- (void)tmp:(NSNumber *)viewTag
{
}

- (NSArray<UIView *> *)getCurrentSharedTransitionViews
{
  return _currentSharedTransitionViews;
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
    UIView *sharedViewScreen = [self getParentScreen:sharedView];
    UIView *stack = [self getScreenStack:sharedViewScreen];
    if (addedNewScreen) {
      [self observeStackChanges:stack];
      [self observeChanges:sharedViewScreen];
    }

    // find sibling for shared view
    NSNumber *siblingViewTag = _findTheOtherForSharedTransition(sharedView.reactTag);
    UIView *siblingView = nil;
    do {
      siblingView = [_animationManager viewForTag:siblingViewTag];
      if (siblingView == nil) {
        [self clearAllSharedConfigsForViewTag:siblingViewTag];
        siblingViewTag = _findTheOtherForSharedTransition(sharedView.reactTag);
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

    // check right target screen configuration
    int count = [stack.reactSubviews count];
    if (addedNewScreen) {
      // is under top
      if (count - 2 < 0) {
        continue;
      }
      UIView *viewSourceParentScreen = [self getParentScreen:viewSource];
      UIView *screenUnderStackTop = stack.reactSubviews[count - 2];
      if (![screenUnderStackTop.reactTag isEqual:viewSourceParentScreen.reactTag]) {
        continue;
      }
    } else {
      // is on top
      if (count - 1 < 0) {
        continue;
      }
      UIView *viewTargetParentScreen = [self getParentScreen:viewTarget];
      UIView *stackTop = stack.reactSubviews[count - 1];
      if (![stackTop.reactTag isEqual:viewTargetParentScreen.reactTag]) {
        continue;
      }
    }

    REASnapshot *sourceViewSnapshot = [[REASnapshot alloc] init:viewSource withParent:viewSource.superview];
    REASnapshot *targetViewSnapshot = [[REASnapshot alloc] init:viewTarget withParent:viewTarget.superview];
    _snapshotRegistry[viewSource.reactTag] = sourceViewSnapshot;
    _snapshotRegistry[viewTarget.reactTag] = targetViewSnapshot;

    [_currentSharedTransitionViews addObject:viewSource];
    [_currentSharedTransitionViews addObject:viewTarget];

    REASharedElement *sharedElement = [[REASharedElement alloc] initWithSourceView:viewSource
                                                                sourceViewSnapshot:sourceViewSnapshot
                                                                        targetView:viewTarget
                                                                targetViewSnapshot:targetViewSnapshot];
    [sharedElements addObject:sharedElement];
  }
  return sharedElements;
}

- (UIView *)getParentScreen:(UIView *)view
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

- (UIView *)getScreenStack:(UIView *)view
{
#if __has_include(<RNScreens/RNSScreen.h>)
  if ([view isKindOfClass:[RNSScreenView class]]) {
    if (view.reactSuperview != nil) {
      if ([view.reactSuperview isKindOfClass:[RNSScreenStackView class]]) {
        return view.reactSuperview;
      }
    }
  }
  while (![view isKindOfClass:[RNSScreenStackView class]] && view.superview != nil) {
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
  [view addObserver:self forKeyPath:@"transitionDuration" options:NSKeyValueObservingOptionNew context:@"reanimated"];
  [view addObserver:self forKeyPath:@"activityState" options:NSKeyValueObservingOptionNew context:nil];

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    // it replaces method for RNSScreenView class, so it can be done only once
    UIViewController *viewController = [view valueForKey:@"controller"];
    [self swizzlMethod:@selector(viewDidLayoutSubviews)
                  with:@selector(swizzled_viewDidLayoutSubviews)
              forClass:[viewController class]];
    [self swizzlMethod:@selector(notifyWillDisappear)
                  with:@selector(swizzled_notifyWillDisappear)
              forClass:[view class]];
  });
}

- (void)observeStackChanges:(UIView *)stack
{
#if __has_include(<RNScreens/RNSScreen.h>)
  if (![stack isKindOfClass:[RNSScreenStackView class]]) {
    return;
  }
  if ([_stackHasObserver containsObject:stack.reactTag]) {
    return;
  }
  [_stackHasObserver addObject:stack.reactTag];
  [stack addObserver:self forKeyPath:@"window" options:NSKeyValueObservingOptionNew context:nil];

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    [self swizzlMethod:@selector(maybeAddToParentAndUpdateContainer)
                  with:@selector(swizzled_maybeAddToParentAndUpdateContainer)
              forClass:[stack class]];
  });
#endif
}

- (void)swizzled_maybeAddToParentAndUpdateContainer
{
  [self swizzled_maybeAddToParentAndUpdateContainer];
  [self setValue:[self valueForKey:@"window"] forKey:@"window"];
}

- (void)swizzlMethod:(SEL)originalSelector with:(SEL)swizzledSelector forClass:(Class)originalClass
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
  UIView *stack = screen;
  while (stack != nil && ![stack isKindOfClass:[RNSScreenStackView class]]) {
    stack = stack.superview;
  }

  if ([keyPath isEqualToString:@"transitionDuration"]) { // added new screen (push)
    if (screen.superview != nil) {
      [self runAsyncSharedTransition];
      [_stackDetectedChange removeObject:stack.reactTag];
    }
  } else if ([keyPath isEqualToString:@"activityState"]) { // removed screen from top (removed from stack or covered by
                                                           // another screen)
    if (stack != nil && [_stackDetectedChange containsObject:stack.reactTag]) {
      if ([self isScreen:screen outsideStack:stack]) {
        [self runSharedTransitionForSharedViewsOnScreen:screen];
      }
      [_stackDetectedChange removeObject:stack.reactTag];
    } else { // removed stack
      for (UIView *child in stack.reactSubviews) {
        [_animationManager visitTree:child
                               block:^int(id<RCTComponent> _Nonnull view) {
                                 [self clearAllSharedConfigsForView:(UIView *)view];
                                 return false;
                               }];
      }
      [_stackHasObserver removeObject:stack.reactTag];
    }
  } else if ([keyPath isEqualToString:@"window"]) { // change in stack
    [_stackDetectedChange addObject:stack.reactTag];
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

- (void)runSharedTransitionForSharedViewsOnScreen:(UIView *)screen
{
  NSMutableArray<UIView *> *removedView = [NSMutableArray new];
  [_animationManager visitTree:screen
                         block:^int(id<RCTComponent> view) {
                           if ([self->_animationManager hasAnimationForTag:view.reactTag
                                                                      type:@"sharedElementTransition"]) {
                             [removedView addObject:(UIView *)view];
                           }
                           return false;
                         }];
  BOOL startedAnimation = [self setupSyncSharedTransitionForViews:removedView];
  if (startedAnimation) {
    for (UIView *view in removedView) {
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
  if (_isSharedTransitionActive == NO) {
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
    _sharedTransitionParent[viewSource.reactTag] = viewSource.superview;
    _sharedTransitionInParentIndex[viewSource.reactTag] = @([viewSource.superview.subviews indexOfObject:viewSource]);
    [viewSource removeFromSuperview];
    [_transitionContainer addSubview:viewSource];

    _sharedTransitionParent[viewTarget.reactTag] = viewTarget.superview;
    _sharedTransitionInParentIndex[viewTarget.reactTag] = @([viewTarget.superview.subviews indexOfObject:viewTarget]);
    [viewTarget removeFromSuperview];
    [_transitionContainer addSubview:viewTarget];
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
  if ([_currentSharedTransitionViews containsObject:view]) {
    [view removeFromSuperview];
    UIView *parent = _sharedTransitionParent[view.reactTag];
    int childIndex = [_sharedTransitionInParentIndex[view.reactTag] intValue];
    [parent insertSubview:view atIndex:childIndex];
    REASnapshot *viewSourcePreviousSnapshot = _snapshotRegistry[view.reactTag];
    [_animationManager progressLayoutAnimationWithStyle:viewSourcePreviousSnapshot.values
                                                 forTag:view.reactTag
                                     isSharedTransition:YES];
    [_currentSharedTransitionViews removeObject:view];
  }
  if ([_currentSharedTransitionViews count] == 0) {
    [_sharedTransitionParent removeAllObjects];
    [_sharedTransitionInParentIndex removeAllObjects];
    [_transitionContainer removeFromSuperview];
    [_currentSharedTransitionViews removeAllObjects];
    _isSharedTransitionActive = NO;
  }
}

- (void)setFindTheOtherForSharedTransitionBlock:(REAFindTheOtherForSharedTransitionBlock)findTheOtherForSharedTransition
{
  _findTheOtherForSharedTransition = findTheOtherForSharedTransition;
}

- (void)clearAllSharedConfigsForView:(UIView *)view
{
  NSNumber *viewTag = view.reactTag;
  if (viewTag != nil) {
    [_snapshotRegistry removeObjectForKey:viewTag];
    [_animationManager clearAnimationConfigForTag:viewTag];
  }
}

- (void)clearAllSharedConfigsForViewTag:(NSNumber *)viewTag
{
  if (viewTag != nil) {
    [_snapshotRegistry removeObjectForKey:viewTag];
    [_animationManager clearAnimationConfigForTag:viewTag];
  }
}

@end
