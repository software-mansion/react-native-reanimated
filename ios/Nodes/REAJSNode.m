#import "REAJSNode.h"
#import "RCTConvert.h"
#import "REANodesManager.h"

@implementation REAJSNode {
  NSString *_jsCode;
  NSArray<NSNumber *> *_args;
  JSContext *_context;
  JSValue *_funcPtr;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _jsCode = config[@"code"];
    _args = config[@"args"];
  }
  return self;
}

- (void)setupJSFunc  {
  NSString *_funcName = [NSString stringWithFormat:@"nodeFunc%@", self.nodeID];
  NSString *_function = [NSString stringWithFormat:@"var %@ = %@", _funcName, _jsCode];
  [self.nodesManager.jsContext evaluateScript:_function];
  _funcPtr = self.nodesManager.jsContext[_funcName];
  if(self.nodesManager.jsContext.exception) {
    RCTLogError(@"Error in JS node function: %@", self.nodesManager.jsContext.exception);
  }
}

- (id)evaluate
{
  if(!_funcPtr) {
    [self setupJSFunc];
  }
  NSMutableArray<NSNumber*>* array = [[NSMutableArray alloc] init];
  for (NSUInteger i = 0; i < _args.count; i++) {
    NSNumber *argsId = [_args objectAtIndex:i];
    REANode *argNode = (REANode *)[self.nodesManager findNodeByID:argsId];
    [array addObject:argNode.value];
  }
  NSNumber* num = [[_funcPtr callWithArguments:array] toNumber];
  return num;
}

@end
