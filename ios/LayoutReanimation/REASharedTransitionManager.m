#import <RNReanimated/REASharedElement.h>
#import <RNReanimated/REASharedTransitionManager.h>
#import <objc/runtime.h>

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
}

- (instancetype)init:(REAAnimationsManager *)animationManager
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

- (void)setupSyncSharedTransitionForViews:(NSArray<UIView *> *)views
{
  NSArray *sharedViews = [self sortViewsByTags:views];
  NSArray<REASharedElement *> *sharedElements = [self getSharedElementForCurrentTransition:sharedViews
                                                                           withNewElements:NO];
  if ([sharedElements count] == 0) {
    return;
  }
  [self setupTransitionContainer];
  [self reparentSharedViewsForCurrentTransition:sharedElements];
  [self startSharedTransition:sharedElements];
}

- (NSArray *)sortViewsByTags:(NSArray *)views
{
  return [views sortedArrayUsingComparator:^NSComparisonResult(UIView *view1, UIView *view2) {
    if ([view1.reactTag intValue] > [view2.reactTag intValue]) {
      return (NSComparisonResult)NSOrderedAscending;
    }
    if ([view1.reactTag intValue] < [view2.reactTag intValue]) {
      return (NSComparisonResult)NSOrderedDescending;
    }
    return (NSComparisonResult)NSOrderedSame;
  }];
}

- (NSMutableArray<REASharedElement *> *)getSharedElementForCurrentTransition:(NSArray *)sharedViews
                                                             withNewElements:(BOOL)withNewElements
{
  NSMutableSet<NSNumber *> *viewTags = [NSMutableSet new];
  if (!withNewElements) {
    for (UIView *view in sharedViews) {
      [viewTags addObject:view.reactTag];
    }
  }
  NSMutableArray<REASharedElement *> *sharedElements = [NSMutableArray new];
  for (UIView *sharedView in sharedViews) {
    NSNumber *targetViewTag = _findTheOtherForSharedTransition(sharedView.reactTag);
    bool bothAreRemoved = !withNewElements && [viewTags containsObject:targetViewTag];
    if (targetViewTag == nil) {
      // the sibling of shared view doesn't exist yet
      continue;
    }
    UIView *viewSource;
    UIView *viewTarget;
    if (withNewElements) {
      viewSource = [_animationManager viewForTag:targetViewTag];
      viewTarget = sharedView;
      UIView *viewTargetParentScreen = [self getParentScreen:viewTarget];
      if (viewTargetParentScreen != nil) {
        [self observeChanges:viewTargetParentScreen];
      }
      UIView *viewSourceParentScreen = [self getParentScreen:viewSource];
      if (viewSourceParentScreen != nil) {
        [self unobserveChanges:viewSourceParentScreen];
      }
    } else {
      viewSource = sharedView;
      viewTarget = [_animationManager viewForTag:targetViewTag];
    }
    if (bothAreRemoved) {
      // case for nested stack
      [self clearAllSharedConfigsForView:viewSource];
      [self clearAllSharedConfigsForView:viewTarget];
      continue;
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
  UIView *screen = view;
  while (![NSStringFromClass([screen class]) isEqualToString:@"RNSScreenView"] && screen.superview != nil) {
    screen = screen.superview;
  }
  if ([NSStringFromClass([screen class]) isEqualToString:@"RNSScreenView"]) {
    return screen;
  }
  return nil;
}

- (void)observeChanges:(UIView *)view
{
  [view addObserver:self forKeyPath:@"window" options:NSKeyValueObservingOptionNew context:nil];
  [view addObserver:self forKeyPath:@"activityState" options:NSKeyValueObservingOptionNew context:nil];

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    // it replaces method for RNSScreenView class, so it can be done only once
    [self swizzlMethod:@selector(reactSetFrame:) with:@selector(swizzled_reactSetFrame:) forClass:[view class]];
    [self swizzlMethod:@selector(notifyWillDisappear)
                  with:@selector(swizzled_notifyWillDisappear)
              forClass:[view class]];
  });
}

- (void)unobserveChanges:(UIView *)view
{
  if ([view observationInfo] != nil) {
    [view removeObserver:self forKeyPath:@"window"];
    [view removeObserver:self forKeyPath:@"activityState"];
  }
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

- (void)swizzled_reactSetFrame:(CGRect)frame
{
  /*
    The screen header is added later than other screen children and changes their
    position on the screen. That's why we need to make a snapshot after the header
    mount. We don't want to add a strong dependency to the react-native-screens
    library so we decided to use KVO from Obj-C. However, all properties of the
    screen are updated without calling Obj-C's setters. We swizzled the method
    `reactSetFrame` - this method is called after the appearance of the header.
    Then we call KVO to notify Reanimated observer about the attached header.
  */
  [self swizzled_reactSetFrame:frame]; // call original method from react-native-screens, self == RNScreenView
  [self setValue:[self valueForKey:@"window"]
          forKey:@"window"]; // call KVO to run runAsyncStaredTransition from Reanimated
}

- (void)swizzled_notifyWillDisappear
{
  [self swizzled_notifyWillDisappear]; // call original method from react-native-screens, self == RNScreenView
  [self setValue:[self valueForKey:@"activityState"]
          forKey:@"activityState"]; // call KVO to run runAsyncStaredTransition from Reanimated
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary<NSKeyValueChangeKey, id> *)change
                       context:(void *)context
{
  UIView *screen = (UIView *)object;
  if ([keyPath isEqualToString:@"window"]) {
    if (screen.superview != nil) {
      [self runAsyncStaredTransition];
    }
  } else if ([keyPath isEqualToString:@"activityState"]) {
    [self runSharedTransitionForSharedViewsOnScreen:screen];
  }
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
  [self setupSyncSharedTransitionForViews:removedView];
  for (UIView *view in removedView) {
    [_animationManager clearAnimationConfigForTag:view.reactTag];
  }
}

- (void)runAsyncStaredTransition
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
  [_snapshotRegistry removeObjectForKey:viewTag];
  [_animationManager clearAnimationConfigForTag:viewTag];
}

@end
