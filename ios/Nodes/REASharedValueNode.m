//
//  REASharedValueNode.m
//  DoubleConversion
//
//  Created by Szymon Kapala on 27/02/2020.
//

#import "REASharedValueNode.h"
#import "NativeProxy.h"

@implementation REASharedValueNode {
  NSObject *_value;
  NSNumber *svId;
}

- (instancetype)initWithID:(REANodeID)nodeID
                    config:(NSDictionary<NSString *, id> *)config
{
  if (self = [super initWithID:nodeID config:config]) {
      svId = config[@"sharedValueId"];
      _value = [NativeProxy getSharedValue:[svId doubleValue]];
    [[REASharedValueNode getSharedValues] setObject:self forKey:svId];
  }
  return self;
}

- (void)setValue:(NSObject *)value
{
  _value = value;
  [self forceUpdateMemoizedValue:value];
}

- (id)evaluate
{
  return _value;
}

+ (NSMutableDictionary *)getSharedValues
{
  static dispatch_once_t once;
  static NSMutableDictionary *sharedValues;
  dispatch_once(&once, ^{
      sharedValues = [NSMutableDictionary new];
  });
  return sharedValues;
}

+ (void)setSharedValue:(NSNumber *)svId newValue:(NSObject *)newValue
{
  REASharedValueNode *node = [[REASharedValueNode getSharedValues] objectForKey:svId];
  [node setValue:newValue];
}

- (void)onDrop
{
  REASharedValueNode *node = [[REASharedValueNode getSharedValues] objectForKey:svId];
  if (node) {
    [[REASharedValueNode getSharedValues] removeObjectForKey:svId];
  }
}

@end
