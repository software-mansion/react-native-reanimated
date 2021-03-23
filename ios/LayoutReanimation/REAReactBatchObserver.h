//
//  REAReactBatchObserver.h
//  RNReanimated
//
//  Created by Szymon Kapala on 22/03/2021.
//

#import <Foundation/Foundation.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerObserverCoordinator.h>
#import <React/RCTUIManagerUtils.h>

NS_ASSUME_NONNULL_BEGIN

@interface REAReactBatchObserver : NSObject <RCTUIManagerObserver>

- (void) invalidate;
- (instancetype)initWithBridge:(RCTBridge*)bridge;

+ (NSMutableSet<NSNumber*>*) animationRootsTags;

@end

NS_ASSUME_NONNULL_END
