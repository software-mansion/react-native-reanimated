#import "REANode.h"
#import "REANodesManager.h"

#import <React/RCTDefines.h>

static NSUInteger loopID = 1;

@interface REANode ()

@property (nonatomic) NSUInteger lastLoopID;
@property (nonatomic) id memoizedValue;
@property (nonatomic, nullable) NSMutableArray<REANode *> *childNodes;

@end

@implementation REANode

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super init])) {
      _nodeID = nodeID;
      _lastLoopID = 0;
    }
    return self;
}

RCT_NOT_IMPLEMENTED(- (instancetype)init)

- (void)dangerouslyRescheduleEvaluate
{
  _lastLoopID = 0;
  [self markUpdated];
}

- (void)forceUpdateMemoizedValue:(id)value
{
  _memoizedValue = value;
  [self markUpdated];
}

- (id)evaluate
{
  return 0;
}

- (id)value
{
  if (_lastLoopID < loopID) {
    _lastLoopID = loopID;
    return (_memoizedValue = [self evaluate]);
  }
  return _memoizedValue;
}

- (void)addChild:(REANode *)child
{
  if (!_childNodes) {
    _childNodes = [NSMutableArray new];
  }
  if (child) {
    [_childNodes addObject:child];
    [self dangerouslyRescheduleEvaluate];
  }
}

- (void)removeChild:(REANode *)child
{
  if (child) {
    [_childNodes removeObject:child];
  }
}

- (void)markUpdated
{
  [[REANode updatedNodes] addObject:self];
  if ([REANode updatedNodes].count == 1) {
    [self.nodesManager postAfterAnimation:^{
      [REANode runPropUpdates];
    }];
  }
}

+ (NSMutableArray<REANode *> *)updatedNodes
{
  static NSMutableArray<REANode *> *updatedNodes;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    updatedNodes = [NSMutableArray new];
  });
  return updatedNodes;
}

+ (void)runPropUpdates
{
  NSMutableSet<REANode *> *visitedNodes = [NSMutableSet new];
  __block __weak void (^ weak_FindAndUpdateNodes)(REANode *);
  void (^findAndUpdateNodes)(REANode *);
  weak_FindAndUpdateNodes = findAndUpdateNodes = ^(REANode *node) {
    if ([visitedNodes containsObject:node]) {
      return;
    } else {
      [visitedNodes addObject:node];
    }
    if ([node respondsToSelector:@selector(update)]) {
      [(id)node update];
    } else {
      for (REANode *child in node.childNodes) {
        weak_FindAndUpdateNodes(child);
      }
    }
  };
  for (NSUInteger i = 0; i < [self updatedNodes].count; i++) {
    findAndUpdateNodes([[self updatedNodes] objectAtIndex:i]);
  }
  [[self updatedNodes] removeAllObjects];
  loopID++;
}

@end
