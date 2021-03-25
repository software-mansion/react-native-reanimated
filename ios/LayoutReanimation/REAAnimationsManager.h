//
//  SnapshotsManager.h
//  RNReanimated
//
//  Created by Szymon Kapala on 24/03/2021.
//

#import <Foundation/Foundation.h>
#import "REASnapshooter.h"
#import <React/RCTUIManager.h>

NS_ASSUME_NONNULL_BEGIN

@interface REAAnimationsManager : NSObject

- (instancetype)initWithUIManager:(RCTUIManager*)uiManager;

- (void)startAnimationWithFirstSnapshot:(REASnapshooter*)snapshooter;
- (void)addSecondSnapshot:(REASnapshooter*)snapshooter;

- (void)setAnimationStartingBlock:(void (^)(NSNumber *tag))startAnimation;
- (void)notifyAboutProgress:(NSNumber*)progress tag:(NSNumber*)tag;

- (void)invalidate;

@end

NS_ASSUME_NONNULL_END
