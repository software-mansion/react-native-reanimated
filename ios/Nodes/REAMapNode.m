#import "REAMapNode.h"

#import "REANodesManager.h"

@implementation REAMapNode
{
  NSMutableDictionary<NSString *, REANodeID> *_mapConfig;
}

- (instancetype)initWithID:(REANodeID)nodeID
                    config:(NSDictionary<NSString *, id> *)config;
{

  if ((self = [super initWithID:nodeID config:config])) {

    _mapConfig = config[@"map"];
  }
  return self;
}

- (id)evaluate
{
  NSMutableDictionary *map = [NSMutableDictionary new];
  for (NSString *prop in _mapConfig) {
    REANode *propNode = [self.nodesManager findNodeByID:_mapConfig[prop]];
    map[prop] = [propNode value];
  }

  return map;
}

@end
