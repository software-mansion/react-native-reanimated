#import "REAEvalContext.h"

@implementation REAEvalContext
static int _nextContextID = 0;

- (instancetype)initWithParent:(REAPerformNode *) parent
{
  if ((self = [super init])) {
    _parent = _parent;
    _updatedNodes = [NSMutableArray new];
    _memoizedValues = [NSMutableDictionary new];
    _lastLoopIDs = [NSMutableDictionary new];
    _contextID = [NSNumber numberWithInt:_nextContextID++];
  }
  return self;
}

@end
