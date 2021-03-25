//
//  SnapshotsManager.m
//  RNReanimated
//
//  Created by Szymon Kapala on 24/03/2021.
//

#import "REAAnimationsManager.h"

@interface REAAnimationsManager ()

@property (atomic, nullable) void(^startAnimationForTag)(NSNumber *);

@end

@implementation REAAnimationsManager {
  RCTUIManager* _uiManager;
  NSMutableDictionary<NSNumber*, REASnapshooter*>* _firstSnapshots;
  NSMutableDictionary<NSNumber*, REASnapshooter*>* _secondSnapshots;
}

- (instancetype)initWithUIManager:(RCTUIManager *)uiManager
{
  if (self = [super init]) {
    _uiManager = uiManager;
    _firstSnapshots = [NSMutableDictionary new];
    _secondSnapshots = [NSMutableDictionary new];
  }
  return self;
}

- (void)invalidate
{
  _uiManager = nil;
}

- (void)startAnimationWithFirstSnapshot:(REASnapshooter*)snapshooter
{
  _firstSnapshots[snapshooter.tag] = nil;
  _secondSnapshots[snapshooter.tag] = nil;
  _firstSnapshots[snapshooter.tag] = snapshooter;
  _startAnimationForTag(snapshooter.tag);
}

- (void)addSecondSnapshot:(REASnapshooter*)snapshooter
{
  _secondSnapshots[snapshooter.tag] = snapshooter;
}

- (void)setAnimationStartingBlock:(void (^)(NSNumber *tag))startAnimation
{
  _startAnimationForTag = startAnimation;
}

- (void)notifyAboutProgress:(NSNumber*)progressNumber tag:(NSNumber*)tag
{
  double progress = [progressNumber doubleValue];
  REASnapshooter* first = _firstSnapshots[tag];
  REASnapshooter* second = _secondSnapshots[tag];
  if (first == nil || second == nil) { // animation is not ready
    return;
  }
  
  NSMutableSet<UIView *>* allViews = [NSMutableSet new];
  for (UIView *view in first.capturedValues.allKeys) {
    [allViews addObject:view];
  }
  for (UIView *view in second.capturedValues.allKeys) {
    [allViews addObject:view];
  }
  
  for (UIView *view in allViews) {
    NSDictionary<NSString*, NSNumber*>* startValues = _firstSnapshots[view];
    NSDictionary<NSString*, NSNumber*>* targetValues = _secondSnapshots[view];
    
    // TODO let ViewManager handle animation progress based on view snapshots
    if (startValues != nil && targetValues != nil) { //interpolate
      // TODO make it more flexiable
      if (progress == 1.0) {
        view.transform = CGAffineTransformIdentity;
        continue;
      }
      
      double currentX = [targetValues[@"originX"] doubleValue] * progress + [startValues[@"originX"] doubleValue] * (1.0 - progress);
      double currentY = [targetValues[@"originY"] doubleValue] * progress + [startValues[@"originY"] doubleValue] * (1.0 - progress);
      double currentWidth = [targetValues[@"width"] doubleValue] * progress + [startValues[@"width"] doubleValue] * (1.0 - progress);
      double currentHeight = [targetValues[@"height"] doubleValue] * progress + [startValues[@"height"] doubleValue] * (1.0 - progress);
      
      double scaleWidth = currentWidth/[targetValues[@"width"] doubleValue];
      double scaleHeight = currentHeight/[targetValues[@"height"] doubleValue];
      
      double translateX = currentX - [targetValues[@"originX"] doubleValue];
      double translateY = currentY - [targetValues[@"originY"] doubleValue];
      
      CGAffineTransform scaleMatrix = CGAffineTransformScale(CGAffineTransformIdentity, scaleWidth, scaleHeight);
      view.transform = CGAffineTransformTranslate(scaleMatrix, translateX, translateY);
    }
    
    //TODO appearing and disappearing
  }
}

@end
