//
//  REABridgeDelegate.h
//  RNReanimated
//
//  Created by Szymon Kapala on 08/10/2020.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeDelegate.h>

NS_ASSUME_NONNULL_BEGIN

@interface REABridgeDelegate : NSObject

- (instancetype)initWithDelegate:(id<RCTBridgeDelegate>)delegate;

@end

NS_ASSUME_NONNULL_END
