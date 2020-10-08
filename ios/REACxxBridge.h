//
//  REACxxBridge.h
//  RNReanimated
//
//  Created by Szymon Kapala on 07/10/2020.
//

#import <Foundation/Foundation.h>

#import "RCTBridge+Private.h"

NS_ASSUME_NONNULL_BEGIN

@interface REACxxBridge : RCTCxxBridge

- (instancetype)initWithParentBridge:(RCTBridge *)bridge NS_DESIGNATED_INITIALIZER;

@end

NS_ASSUME_NONNULL_END
