#import "REAPropsNode.h"

#import "REANodesManager.h"
#import "REAStyleNode.h"

#import <React/RCTLog.h>
#import <React/RCTUIManager.h>

@implementation REAPropsNode
{
  NSNumber *_connectedViewTag;
  NSString *_connectedViewName;
  NSMutableDictionary<NSString *, REANodeID> *_propsConfig;
}

- (instancetype)initWithID:(REANodeID)nodeID
                    config:(NSDictionary<NSString *,id> *)config
{
  if (self = [super initWithID:nodeID config:config]) {
    _propsConfig = config[@"props"];
  }
  return self;
}

- (void)connectToView:(NSNumber *)viewTag
             viewName:(NSString *)viewName
{
  _connectedViewTag = viewTag;
  _connectedViewName = viewName;
  [self dangerouslyRescheduleEvaluate];
}

- (void)disconnectFromView:(NSNumber *)viewTag
{
  _connectedViewTag = nil;
  _connectedViewName = nil;
}

- (id)evaluate
{
  NSMutableDictionary *props = [NSMutableDictionary new];
  for (NSString *prop in _propsConfig) {
    REANode *propNode = [self.nodesManager findNodeByID:_propsConfig[prop]];

    if ([propNode isKindOfClass:[REAStyleNode class]]) {
      [props addEntriesFromDictionary:[propNode value]];
    } else {
      props[prop] = [propNode value];
    }
  }

  return props;
}

- (void)update
{
  // Since we are updating nodes after detaching them from views there is a time where it's
  // possible that the view was disconnected and still receive an update, this is normal and we can
  // simply skip that update.
  if (!_connectedViewTag) {
    return;
  }

  NSDictionary *props = [self value];
  if (props.count) {
    [self.nodesManager.uiManager
     synchronouslyUpdateViewOnUIThread:_connectedViewTag
     viewName:_connectedViewName
     props:props];
  }
}

@end

