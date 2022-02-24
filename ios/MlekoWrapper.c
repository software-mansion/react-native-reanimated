//
//  MlekoWrapper.c
//  RNReanimated
//
//  Created by Krzysztof Piaskowy on 24/02/2022.
//

#include "MlekoWrapper.h"

@implementation MlekoWrapper

- (instancetype)init
{
  self = [super init];
  return self;
}

 - (bool) isDirty:(NSMutableDictionary<NSNumber *, RCTShadowView *> *)shadowViewRegistry viewTag:(NSNumber*)viewTag
{
  if (shadowViewRegistry[viewTag]) {
    return shadowViewRegistry[viewTag].yogaNode->isDirty();
  }
  return true;
}

@end
