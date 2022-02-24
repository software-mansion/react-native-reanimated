//
//  MlekoWrapper.h
//  RNReanimated
//
//  Created by Krzysztof Piaskowy on 24/02/2022.
//

#ifndef MlekoWrapper_h
#define MlekoWrapper_h

#include <stdio.h>
#import <React/RCTShadowView.h>
#import <yoga/Yoga.h>
#import <yoga/YGNode.h>

@interface MlekoWrapper : NSObject
- (instancetype)init;
- (bool) isDirty:(NSMutableDictionary<NSNumber *, RCTShadowView *> *)shadowViewRegistry viewTag:(NSNumber*)viewTag;
@end

#endif /* MlekoWrapper_h */
