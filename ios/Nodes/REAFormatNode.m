#import "REAFormatNode.h"
#import "REAValueNode.h"
#import "REANodesManager.h"

@implementation REAFormatNode {
  NSNumber *_value;
  NSString *_format;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _value = config[@"value"];
    _format = config[@"format"];
  }
  return self;
}

- (id)evaluate
{
  NSMutableString *result = [NSMutableString new];
  id val = [[self.nodesManager findNodeByID:_value] value];
  if ([val isKindOfClass:[NSNumber class]]) {
    NSNumberFormatter *numberFormatter = [[NSNumberFormatter alloc] init];
    [numberFormatter setPositiveFormat:_format];
    [result appendString:[numberFormatter stringFromNumber:val]];
  }
  if ([val isKindOfClass:[NSString class]]) {
    [result appendString:val];
  }
  return result;
}

@end
