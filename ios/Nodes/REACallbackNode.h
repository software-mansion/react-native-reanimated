#import "REANode.h"

@interface REACallbackNode : REANode

- (void)setValue:(NSArray *)value;

- (RCTResponseSenderBlock)cb:(NSArray *response);

- (void)cb:(^RCTResponseErrorBlock)(NSError *error);

- (void)cb:(^RCTPromiseResolveBlock)(id result);

- (void)cb:(^RCTPromiseRejectBlock)(NSString *code, NSString *message, NSError *error);

@end
