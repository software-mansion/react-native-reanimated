#include <tgmath.h>

#import "REAOperatorNode.h"
#import "REANodesManager.h"

typedef id (^REAOperatorBlock)(NSArray<REANode *> *inputNodes, REAEvalContext *evalContext);

#define REA_REDUCE(OP, evalContext) ^(NSArray<REANode *> *inputNodes, REAEvalContext *evalContext) { \
CGFloat acc = [[inputNodes[0] value:evalContext] doubleValue]; \
for (NSUInteger i = 1; i < inputNodes.count; i++) { \
  CGFloat a = acc, b = [[inputNodes[i] value:evalContext] doubleValue]; \
  acc = OP; \
} \
return @(acc); \
}

#define REA_SINGLE(OP, evalContext) ^(NSArray<REANode *> *inputNodes, REAEvalContext *evalContext) { \
CGFloat a = [[inputNodes[0] value:evalContext] doubleValue]; \
return @(OP); \
}

#define REA_INFIX(OP, evalContext) ^(NSArray<REANode *> *inputNodes, REAEvalContext *evalContext) { \
CGFloat a = [[inputNodes[0] value:evalContext] doubleValue]; \
CGFloat b = [[inputNodes[1] value:evalContext] doubleValue]; \
return @(OP); \
}

@implementation REAOperatorNode {
  NSArray<NSNumber *> *_input;
  NSMutableArray<REANode *> *_inputNodes;
  REAOperatorBlock _op;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  static NSDictionary *OPS;
  static dispatch_once_t opsToken;
  dispatch_once(&opsToken, ^{
    OPS = @{
            // arithmetic
            @"add": REA_REDUCE(a + b, evalContext),
            @"sub": REA_REDUCE(a - b, evalContext),
            @"multiply": REA_REDUCE(a * b, evalContext),
            @"divide": REA_REDUCE(a / b, evalContext),
            @"pow": REA_REDUCE(pow(a, b), evalContext),
            @"modulo": REA_REDUCE(fmodf(fmodf(a, b) + b, b), evalContext),
            @"sqrt": REA_SINGLE(sqrt(a), evalContext),
            @"sin": REA_SINGLE(sin(a), evalContext),
            @"cos": REA_SINGLE(cos(a), evalContext),
            @"exp": REA_SINGLE(exp(a), evalContext),
            @"round": REA_SINGLE(round(a), evalContext),

            // logical
            @"and": ^(NSArray<REANode *> *inputNodes, REAEvalContext *evalContext) {
              BOOL res = [[inputNodes[0] value:evalContext] doubleValue];
              for (NSUInteger i = 1; i < inputNodes.count && res; i++) {
                res = res && [[inputNodes[i] value:evalContext] doubleValue];
              }
              return res ? @(1.) : @(0.);
            },
            @"or": ^(NSArray<REANode *> *inputNodes, REAEvalContext *evalContext) {
              BOOL res = [[inputNodes[0] value:evalContext] doubleValue];
              for (NSUInteger i = 1; i < inputNodes.count && !res; i++) {
                res = res || [[inputNodes[i] value:evalContext] doubleValue];
              }
              return res ? @(1.) : @(0.);
            },
            @"not": REA_SINGLE(!a, evalContext),
            @"defined": ^(NSArray<REANode *> *inputNodes, REAEvalContext *evalContext) {
              id val = [inputNodes[0] value:evalContext];
              id res = @(val != nil && !([val isKindOfClass:[NSNumber class]] && isnan([val doubleValue])));
              return res;
            },

            // comparing
            @"lessThan": REA_INFIX(a < b, evalContext),
            @"eq": REA_INFIX(a == b, evalContext),
            @"greaterThan": REA_INFIX(a > b, evalContext),
            @"lessOrEq": REA_INFIX(a <= b, evalContext),
            @"greaterOrEq": REA_INFIX(a >= b, evalContext),
            @"neq": REA_INFIX(a != b, evalContext),
            };
  });
  if ((self = [super initWithID:nodeID config:config])) {
    _input = config[@"input"];
    _inputNodes = [NSMutableArray arrayWithCapacity:_input.count];
    _op = OPS[config[@"op"]];
    if (!_op) {
      RCTLogError(@"Operator '%@' not found", config[@"op"]);
    }
  }
  return self;
}

- (id)evaluate:(REAEvalContext *)evalContext;
{
  for (NSUInteger i = 0; i < _input.count; i++) {
    _inputNodes[i] = [self.nodesManager findNodeByID:_input[i]];
  }
  return _op(_inputNodes, evalContext);
}

@end

