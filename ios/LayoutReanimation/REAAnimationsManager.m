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
}

- (instancetype)initWithUIManager:(RCTUIManager *)uiManager
{
  if (self = [super init]) {
    _uiManager = uiManager;
  }
  return self;
}

- (void)invalidate
{
  _uiManager = nil;
}

- (void)startAnimationWithFirstSnapshot:(REASnapshooter*)snapshooter
{
  //TODO
}

- (void)addSecondSnapshot:(REASnapshooter*)snapshooter
{
  //TODO
}

- (void)setAnimationStartingBlock:(void (^)(NSNumber *tag))startAnimation
{
  _startAnimationForTag = startAnimation;
}

- (void)notifyAboutProgress:(NSNumber*)progress tag:(NSNumber*)tag
{
  //TODO
}

@end
