#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REAUIManager.h>
#import <React/RCTComponentData.h>
#import <React/RCTTextView.h>
#import <React/UIView+Private.h>
#import <React/UIView+React.h>

typedef NS_ENUM(NSInteger, FrameConfigType) { EnteringFrame, ExitingFrame };

@implementation REAAnimationsManager {
  RCTUIManager *_uiManager;
  REAUIManager *_reaUiManager;
  NSMutableDictionary<NSNumber *, UIView *> *_exitingViews;
  NSMutableDictionary<NSNumber *, NSNumber *> *_ancestorsOfExitingViews;
  NSMutableSet<NSNumber *> *_toRemove;
  NSMutableArray<NSString *> *_targetKeys;
  NSMutableArray<NSString *> *_currentKeys;
  BOOL _cleaningScheduled;
  REAAnimationStartingBlock _startAnimationForTag;
  REAHasAnimationBlock _hasAnimationForTag;
  REAAnimationRemovingBlock _removeConfigForTag;
}

+ (NSArray *)layoutKeys
{
  static NSArray *_array;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    _array = @[ @"originX", @"originY", @"width", @"height" ];
  });
  return _array;
}

- (instancetype)initWithUIManager:(RCTUIManager *)uiManager
{
  if (self = [super init]) {
    _uiManager = uiManager;
    _reaUiManager = (REAUIManager *)uiManager;
    _exitingViews = [NSMutableDictionary new];
    _toRemove = [NSMutableSet new];
    _cleaningScheduled = false;

    _targetKeys = [NSMutableArray new];
    _currentKeys = [NSMutableArray new];
    for (NSString *key in [[self class] layoutKeys]) {
      [_targetKeys addObject:[NSString stringWithFormat:@"target%@", [key capitalizedString]]];
      [_currentKeys addObject:[NSString stringWithFormat:@"current%@", [key capitalizedString]]];
    }
  }
  return self;
}

- (void)invalidate
{
  // TODO: perhaps want to unmount
  _startAnimationForTag = nil;
  _hasAnimationForTag = nil;
  _removeConfigForTag = nil;
  _uiManager = nil;
  _exitingViews = nil;
  _ancestorsOfExitingViews = nil;
  _toRemove = nil;
  _cleaningScheduled = false;
  _targetKeys = nil;
  _currentKeys = nil;
}

- (void)setAnimationStartingBlock:(REAAnimationStartingBlock )startAnimation
{
  _startAnimationForTag = startAnimation;
}

- (void)setHasAnimationBlock:(REAHasAnimationBlock)hasAnimation
{
  _hasAnimationForTag = hasAnimation;
}

- (void)setRemovingConfigBlock:(REAAnimationRemovingBlock)block
{
  _removeConfigForTag = block;
}

- (void)scheduleCleaning
{
  if (_cleaningScheduled) {
    return;
  }
  _cleaningScheduled = true;

  __weak REAAnimationsManager *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    self->_cleaningScheduled = false;
    if (weakSelf == nil) {
      return;
    }
    [self removeLeftovers];
  });
}

- (UIView*)viewForTag:(NSNumber *)tag
{
  UIView *view = [_reaUiManager viewForReactTag:tag];
  if (view == nil) {
    return [_exitingViews objectForKey:tag];
  }
  return view;
}

- (void)notifyAboutEnd:(NSNumber *)tag cancelled:(BOOL)cancelled
{
  NSLog(@"END %@", tag);
  UIView *view = [_exitingViews objectForKey:tag];
  [_exitingViews removeObjectForKey:tag];
  [view removeFromSuperview];
}

- (void)notifyAboutProgress:(NSDictionary *)newStyle tag:(NSNumber *)tag
{

  NSLog(@"PROGRESS %@ %@", tag, newStyle);

  NSMutableDictionary *dataComponenetsByName = [_uiManager valueForKey:@"_componentDataByName"];
  RCTComponentData *componentData = dataComponenetsByName[@"RCTView"];
  [self setNewProps:[newStyle mutableCopy] forView:[self viewForTag:tag] withComponentData:componentData];
}

- (double)getDoubleOrZero:(NSNumber *)number
{
  double doubleValue = [number doubleValue];
  if (doubleValue != doubleValue) { // NaN != NaN
    return 0;
  }
  return doubleValue;
}

- (void)setNewProps:(NSMutableDictionary *)newProps
              forView:(UIView *)view
    withComponentData:(RCTComponentData *)componentData
{
  if (newProps[@"height"]) {
    double height = [self getDoubleOrZero:newProps[@"height"]];
    double oldHeight = view.bounds.size.height;
    view.bounds = CGRectMake(0, 0, view.bounds.size.width, height);
    view.center = CGPointMake(view.center.x, view.center.y - oldHeight / 2.0 + view.bounds.size.height / 2.0);
    [newProps removeObjectForKey:@"height"];
  }
  if (newProps[@"width"]) {
    double width = [self getDoubleOrZero:newProps[@"width"]];
    double oldWidth = view.bounds.size.width;
    view.bounds = CGRectMake(0, 0, width, view.bounds.size.height);
    view.center = CGPointMake(view.center.x + view.bounds.size.width / 2.0 - oldWidth / 2.0, view.center.y);
    [newProps removeObjectForKey:@"width"];
  }
  if (newProps[@"originX"]) {
    double originX = [self getDoubleOrZero:newProps[@"originX"]];
    view.center = CGPointMake(originX + view.bounds.size.width / 2.0, view.center.y);
    [newProps removeObjectForKey:@"originX"];
  }
  if (newProps[@"originY"]) {
    double originY = [self getDoubleOrZero:newProps[@"originY"]];
    view.center = CGPointMake(view.center.x, originY + view.bounds.size.height / 2.0);
    [newProps removeObjectForKey:@"originY"];
  }
  [componentData setProps:newProps forView:view];
}

- (NSDictionary *)prepareDataForAnimatingWorklet:(NSMutableDictionary *)values frameConfig:(FrameConfigType)frameConfig
{
  UIView *windowView = UIApplication.sharedApplication.keyWindow;
  if (frameConfig == EnteringFrame) {
    NSDictionary *preparedData = @{
      @"targetWidth" : values[@"width"],
      @"targetHeight" : values[@"height"],
      @"targetOriginX" : values[@"originX"],
      @"targetOriginY" : values[@"originY"],
      @"targetGlobalOriginX" : values[@"globalOriginX"],
      @"targetGlobalOriginY" : values[@"globalOriginY"],
      @"windowWidth" : [NSNumber numberWithDouble:windowView.bounds.size.width],
      @"windowHeight" : [NSNumber numberWithDouble:windowView.bounds.size.height]
    };
    return preparedData;
  } else {
    NSDictionary *preparedData = @{
      @"currentWidth" : values[@"width"],
      @"currentHeight" : values[@"height"],
      @"currentOriginX" : values[@"originX"],
      @"currentOriginY" : values[@"originY"],
      @"currentGlobalOriginX" : values[@"globalOriginX"],
      @"currentGlobalOriginY" : values[@"globalOriginY"],
      @"windowWidth" : [NSNumber numberWithDouble:windowView.bounds.size.width],
      @"windowHeight" : [NSNumber numberWithDouble:windowView.bounds.size.height]
    };
    return preparedData;
  }
}

- (NSDictionary *)prepareDataForLayoutAnimatingWorklet:(NSMutableDictionary *)currentValues
                                          targetValues:(NSMutableDictionary *)targetValues
{
  UIView *windowView = UIApplication.sharedApplication.keyWindow;
  NSDictionary *preparedData = @{
    @"currentWidth" : currentValues[@"width"],
    @"currentHeight" : currentValues[@"height"],
    @"currentOriginX" : currentValues[@"originX"],
    @"currentOriginY" : currentValues[@"originY"],
    @"currentGlobalOriginX" : currentValues[@"globalOriginX"],
    @"currentGlobalOriginY" : currentValues[@"globalOriginY"],
    @"targetWidth" : targetValues[@"width"],
    @"targetHeight" : targetValues[@"height"],
    @"targetOriginX" : targetValues[@"originX"],
    @"targetOriginY" : targetValues[@"originY"],
    @"targetGlobalOriginX" : targetValues[@"globalOriginX"],
    @"targetGlobalOriginY" : targetValues[@"globalOriginY"],
    @"windowWidth" : [NSNumber numberWithDouble:windowView.bounds.size.width],
    @"windowHeight" : [NSNumber numberWithDouble:windowView.bounds.size.height]
  };
  return preparedData;
}

- (BOOL)wantsHandleRemovalOfView:(UIView *)view
{
  // TODO: we also want to handle removal if views are kept "alive" b.c. of exiting animation of their children
  return _hasAnimationForTag(view.reactTag, @"exiting");
}

- (void)removeChildren:(NSArray<UIView *> *)children fromContainer:(UIView *)container
{
  for (UIView *removedChild in children) {
    if (_hasAnimationForTag(removedChild.reactTag, @"exiting")) {
      REASnapshot *before = [[REASnapshot alloc] init:removedChild];
      // start exit animation
      UIView *originalSuperview = removedChild.superview;
      NSUInteger originalIndex = [originalSuperview.subviews indexOfObjectIdenticalTo:removedChild];
      [container removeReactSubview:removedChild];
      removedChild.userInteractionEnabled = NO;
      [originalSuperview insertSubview:removedChild atIndex:originalIndex];
      NSDictionary *preparedValues = [self prepareDataForAnimatingWorklet:before.values frameConfig:ExitingFrame];
      [_exitingViews setObject:removedChild forKey:removedChild.reactTag];
      _startAnimationForTag(removedChild.reactTag, @"exiting", preparedValues, @(0));
    } else {
      [container removeReactSubview:removedChild];
    }
  }
}

- (void)onViewCreate:(UIView *)view after:(REASnapshot *)after
{
  NSMutableDictionary *targetValues = after.values;
  NSDictionary *preparedValues = [self prepareDataForAnimatingWorklet:targetValues frameConfig:EnteringFrame];
  _startAnimationForTag(view.reactTag, @"entering", preparedValues, @(0));
}

- (void)onViewUpdate:(UIView *)view before:(REASnapshot *)before after:(REASnapshot *)after
{
  NSNumber *tag = view.reactTag;
  NSMutableDictionary *targetValues = after.values;
  NSMutableDictionary *currentValues = before.values;

  // TODO: maybe restore the below code?
//  if (state == Appearing) {
//    BOOL doNotStartLayout = true;
//    for (int i = 0; i < [[self class] layoutKeys].count; ++i) {
//      if ([((NSNumber *)currentValues[_currentKeys[i]]) doubleValue] !=
//          [((NSNumber *)targetValues[_targetKeys[i]]) doubleValue]) {
//        doNotStartLayout = false;
//      }
//    }
//    if (doNotStartLayout) {
//      return;
//    }
//  }
  NSDictionary *preparedValues = [self prepareDataForLayoutAnimatingWorklet:currentValues targetValues:targetValues];
  _startAnimationForTag(view.reactTag, @"layout", preparedValues, @(0));
}

- (REASnapshot *)prepareSnapshotBeforeMountForView:(UIView *)view
{
  if (_hasAnimationForTag(view.reactTag, @"layout")) {
    return [[REASnapshot alloc] init:view];
  }
  return nil;
}

- (void)viewDidMount:(UIView *)view withBeforeSnapshot:(nonnull REASnapshot *)snapshot
{
  NSString *type = snapshot == nil ? @"entering" : @"layout";
  if (_hasAnimationForTag(view.reactTag, type)) {
    REASnapshot *after = [[REASnapshot alloc] init:view];
    if (snapshot == nil) {
      [self onViewCreate:view after:after];
    } else {
      [self onViewUpdate:view before:snapshot after:after];
    }
  }
}

@end
