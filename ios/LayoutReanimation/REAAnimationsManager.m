#import "REAAnimationsManager.h"
#import <React/RCTComponentData.h>
#import "REAAnimationRootView.h"
#import <React/UIView+React.h>
#import <React/UIView+Private.h>
#import "REAViewTraverser.h"

@interface REAAnimationsManager ()

@property (atomic, nullable) void(^startAnimationForTag)(NSNumber *, NSString *, NSDictionary *, NSNumber*);
@property (atomic, nullable) void(^removeConfigForTag)(NSNumber *);

- (void)removeLeftovers:(NSNumber*)tag;
- (void)scheduleCleaning;

@end

typedef NS_ENUM(NSInteger, ViewState) {
    Appearing,
    Disappearing,
    Layout,
    Inactive,
    ToRemove,
};

@implementation REAAnimationsManager {
  RCTUIManager* _uiManager;
  NSMutableDictionary<NSNumber*, NSNumber *>* _states;
  NSMutableDictionary<NSNumber*, UIView *>* _viewForTag;
  NSMutableDictionary<NSNumber*, NSNumber *>* _animatedLayout;
  NSMutableSet<NSNumber*>* _toRemove;
  NSMutableDictionary<NSNumber*, UIView *>* _animatedLayoutHangingPoint;
}

+ (NSArray *)layoutKeys
{
    static NSArray *_array;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        _array = @[@"originX", @"originY", @"width", @"height"];
    });
    return _array;
}

- (instancetype)initWithUIManager:(RCTUIManager *)uiManager
{
  if (self = [super init]) {
    _uiManager = uiManager;
    _states = [NSMutableDictionary new];
    _viewForTag = [NSMutableDictionary new];
    _animatedLayout = [NSMutableDictionary new];
    _toRemove = [NSMutableSet new];
    _animatedLayoutHangingPoint = [NSMutableDictionary new];
  }
  return self;
}

- (void)invalidate
{
  _startAnimationForTag = nil;
  _removeConfigForTag = nil;
  _uiManager = nil;
  _states = nil;
  _animatedLayout = nil;
  _viewForTag = nil;
  _toRemove = nil;
  _animatedLayoutHangingPoint = nil;
}

- (void)notifyAboutChangeWithBeforeSnapshots:(REASnapshooter*)before afterSnapshooter:(REASnapshooter*)after
{
  // TODO native view which are not a part of React may not have reactTag use NSData instead;
  NSMutableArray<UIView*>* allViews = [[NSMutableArray alloc] initWithArray:before.listView];
  [allViews addObjectsFromArray:after.listView];
  allViews = [[NSOrderedSet orderedSetWithArray:allViews].array mutableCopy];
  
  //update view for tag and setAnimatedLayout
  for (UIView * view in allViews) {
    if (_states[view.reactTag] == nil) {
      _states[view.reactTag] = [NSNumber numberWithInt:Inactive];
    }
    _viewForTag[view.reactTag] = view;
    _animatedLayout[view.reactTag] = before.tag;
  }
  
  // attach all orphan views
  for (UIView * view in allViews) {
    if (view.superview != nil) {
      continue;
    }
    if ([view isKindOfClass:[REAAnimationRootView class]]) {
      NSArray<UIView *> *pathToTheRoot = (NSArray<UIView *>*)before.capturedValues[[REASnapshooter idFor:view]][@"pathToWindow"];
      for (int i = 1; i < [pathToTheRoot count]; ++i) {
        UIView * current = pathToTheRoot[i-1];
        UIView * parent = pathToTheRoot[i];
        if (current.superview == nil) {
          [parent addSubview:current];
          _animatedLayoutHangingPoint[view.reactTag] = parent;
        }
      }
    } else {
      UIView * parent = (UIView*) before.capturedValues[[REASnapshooter idFor:view]][@"parent"];
      [parent addSubview:view];
    }
  }
  
  for (UIView * view in allViews) {
    int tag = [view.reactTag intValue];
    NSString * type = @"entering";
    NSMutableDictionary * startValues = before.capturedValues[[REASnapshooter idFor:view]];
    NSMutableDictionary * targetValues = after.capturedValues[[REASnapshooter idFor:view]];
    
    ViewState viewState = [_states[view.reactTag] intValue];
    if (viewState == Disappearing || viewState == ToRemove) {
      continue; // Maybe we should update an animation instead of skipping
    }
    if (viewState == Appearing && startValues != nil && targetValues == nil) {
        _states[view.reactTag] = [NSNumber numberWithInt: Disappearing];
        type = @"exiting";
        NSDictionary* preparedValues = [self prepareDataForAnimatingWorklet:startValues];
        _startAnimationForTag(view.reactTag, type, preparedValues, @(0));
        continue;
    }
    if (viewState == Appearing) {
        // If component is dirty but all layout properties are the same then do not start a new animation
        bool doNotStartLayoutAnimation = true;
        for (NSString * key in [[self class] layoutKeys]) {
            if ([((NSNumber *)startValues[key]) doubleValue] !=  [((NSNumber *)targetValues[key]) doubleValue]) {
                doNotStartLayoutAnimation = false;
            }
        }
        if (doNotStartLayoutAnimation) {
            continue;
        }
    }
  
    if (viewState == Inactive) { // it can be a fresh view
      if (startValues == nil && targetValues != nil) {
        NSDictionary* preparedValues = [self prepareDataForAnimatingWorklet:targetValues];
        _startAnimationForTag(view.reactTag, type, preparedValues, @(0));
      }
      if (startValues != nil && targetValues == nil) {
        _states[view.reactTag] = [NSNumber numberWithInt:ToRemove];
      }
      continue;
    }
    // View must be in Layout State
    type = @"layout";
    if (targetValues == nil && startValues != nil) {
      _states[view.reactTag] = [NSNumber numberWithInt: Disappearing];
      type = @"exiting";
      NSDictionary* preparedValues = [self prepareDataForAnimatingWorklet:startValues];
      _startAnimationForTag(view.reactTag, type, preparedValues, @(0));
      continue;
    }
    
    NSDictionary* preparedStartValues = [self prepareDataForAnimatingWorklet:startValues];
    NSDictionary* preparedTargetValues = [self prepareDataForAnimatingWorklet:targetValues];
    NSMutableDictionary * preparedValues = [NSMutableDictionary new];
    [preparedValues addEntriesFromDictionary:preparedTargetValues];
    for (NSString* key in preparedStartValues.allKeys) {
      preparedValues[[NSString stringWithFormat:@"%@%@", @"b", key]] = preparedStartValues[key];
    }
    
    _startAnimationForTag(view.reactTag, type, preparedValues, @(0));
  }
  
  [self removeLeftovers: before.tag];
}

- (void)scheduleCleaning
{
  __weak REAAnimationsManager *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    if (weakSelf == nil) {
      return;
    }
    NSMutableSet<NSNumber*> * toRemove = _toRemove;
    _toRemove = [NSMutableSet new];
    
    NSMutableSet<NSNumber *>* candidates = [NSMutableSet new];
    for (NSNumber * tag in toRemove) {
      UIView * view = _viewForTag[tag];
      if (view == nil) {
        continue;
      }
      [candidates addObject: _animatedLayout[tag]];
    }
    
    for (NSNumber * tag in candidates) {
      [self removeLeftovers:tag];
    }
  });
}

- (BOOL) dfs:(UIView *)view disapperingAbove:(BOOL)disappearingAbove
{
  BOOL active = false;
  ViewState state = [_states[view.reactTag] intValue];
  BOOL disappearing = state == ToRemove || state == Disappearing;
  
  for (UIView* child in view.subviews) {
    BOOL childAns = [self dfs:child disapperingAbove:(disappearingAbove || disappearing)];
    active |= childAns;
  }
  
  if (!disappearingAbove && state == ToRemove && !active) {
    [REAViewTraverser traverse:view withBlock:^(UIView * _Nonnull current) {
      [_states removeObjectForKey:current.reactTag];
      [_animatedLayout removeObjectForKey:current.reactTag];
      [_viewForTag removeObjectForKey:current.reactTag];
      _removeConfigForTag(current.reactTag);
      if (view.reactTag == current.reactTag) { 
        if ([view isKindOfClass:[REAAnimationRootView class]]) {
          UIView * hangingPoint = _animatedLayoutHangingPoint[view.reactTag];
          UIView * tmp = view;
          while (tmp.superview != nil && tmp != hangingPoint) {
            UIView * next = tmp.superview;
            [tmp removeFromSuperview];
            tmp = next;
          }
          [_animatedLayoutHangingPoint removeObjectForKey:view.reactTag];
        } else {
          [view removeFromSuperview];
        }
      }
      for (UIView * child in view.subviews) {
        [child removeFromSuperview];
      }
      
    } shouldSkipAnimationRoots:false depth:(1e9)];
  }
  
  return active || (!(ToRemove == state));
}

- (void)removeLeftovers:(NSNumber*)tag
{
  UIView * view = _viewForTag[tag];
  if (view == nil) {
    return;
  }
  [self dfs:view disapperingAbove:false];
}

- (void)setAnimationStartingBlock:(void (^)(NSNumber * tag, NSString * type, NSDictionary* yogaValues, NSNumber* depth))startAnimation
{
  _startAnimationForTag = startAnimation;
}

- (void)setRemovingConfigBlock:(void (^)(NSNumber *tag))block
{
  _removeConfigForTag = block;
}

- (void)notifyAboutProgress:(NSDictionary *)newStyle tag:(NSNumber*)tag
{
  ViewState state = [_states[tag] intValue];
  if (state == Inactive) {
    _states[tag] = [NSNumber numberWithInt:Appearing];
  }
  
  NSMutableDictionary* dataComponenetsByName = [_uiManager valueForKey:@"_componentDataByName"];
  RCTComponentData *componentData = dataComponenetsByName[@"RCTView"];
  [self setNewProps:[newStyle mutableCopy] forView:_viewForTag[tag] withComponentData:componentData];
}

- (void)notifyAboutEnd:(NSNumber*)tag cancelled:(BOOL)cancelled
{
  if (!cancelled) {
    //Update State
    ViewState state = [_states[tag] intValue];
    if (state == Appearing) {
      _states[tag] = [NSNumber numberWithInt:Layout];
    }
    if (state == Disappearing) {
      _states[tag] = [NSNumber numberWithInt:ToRemove];
      [_toRemove addObject:tag];
      [self scheduleCleaning];
    }
  }
}

- (void)setNewProps:(NSMutableDictionary *)newProps forView:(UIView*)view withComponentData:(RCTComponentData*)componentData
{
  if (newProps[@"height"]) {
    double height = [newProps[@"height"] doubleValue];
    double oldHeight = view.bounds.size.height;
    view.bounds = CGRectMake(0, 0, view.bounds.size.width, height);
    view.center = CGPointMake(view.center.x, view.center.y - oldHeight/2.0 + view.bounds.size.height/2.0);
    [newProps removeObjectForKey:@"height"];
  }
  if (newProps[@"width"]) {
    double width = [newProps[@"width"] doubleValue];
    double oldWidth = view.bounds.size.width;
    view.bounds = CGRectMake(0, 0, width, view.bounds.size.height);
    view.center = CGPointMake(view.center.x + view.bounds.size.width/2.0 - oldWidth/2.0, view.center.y);
    [newProps removeObjectForKey:@"width"];
  }
  if (newProps[@"originX"]) {
    double originX = [newProps[@"originX"] doubleValue];
    view.center = CGPointMake(originX + view.bounds.size.width/2.0, view.center.y);
    [newProps removeObjectForKey:@"originX"];
  }
  if (newProps[@"originY"]) {
    double originY = [newProps[@"originY"] doubleValue];
    view.center = CGPointMake(view.center.x, originY + view.bounds.size.height/2.0);
    [newProps removeObjectForKey:@"originY"];
  }
  [componentData setProps:newProps forView:view];
}

- (NSDictionary*) prepareDataForAnimatingWorklet:(NSMutableDictionary*)values
{
  UIView *windowView = UIApplication.sharedApplication.keyWindow;
  NSDictionary* preparedData = @{
    @"width": values[@"width"],
    @"height": values[@"height"],
    @"originX": values[@"originX"],
    @"originY": values[@"originY"],
    @"globalOriginX": values[@"globalOriginX"],
    @"globalOriginY": values[@"globalOriginY"],
    @"windowWidth": [NSNumber numberWithDouble:windowView.bounds.size.width],
    @"windowHeight": [NSNumber numberWithDouble:windowView.bounds.size.height]
  };
  return preparedData;
}

@end
