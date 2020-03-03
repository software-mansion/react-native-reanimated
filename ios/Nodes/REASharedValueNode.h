//
//  REASharedValueNode.h
//  DoubleConversion
//
//  Created by Szymon Kapala on 27/02/2020.
//

#import <Foundation/Foundation.h>
#import "REANode.h"

NS_ASSUME_NONNULL_BEGIN

@class REASharedValueNode;

@interface REASharedValueNode : REANode

+ (void)setSharedValue:(NSNumber *)svId newValue:(NSObject *)newValue;

- (void)setValue:(NSObject *)value;

@end

NS_ASSUME_NONNULL_END
