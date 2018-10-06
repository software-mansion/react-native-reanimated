#import "REAEvalContext.h"

@implementation REAEvalContext
static int _nextContextID = 0;

- (instancetype)initWithParent:(REAPerformNode *) parent
{
  if ((self = [super init])) {
    _parent = parent;
    _updatedNodes = [NSMutableArray new];
    _memoizedValues = [NSMutableDictionary new];
    _lastLoops = [NSMutableDictionary new];
    _contextID = [NSNumber numberWithInt:_nextContextID++];
  }
  return self;
}

@end

@implementation REANodeLoopWrapper

- (instancetype)init
{
  if ((self = [super init])) {
    _ID = 0;
  }
  return self;
}

@end
