#import "REACallbackNode.h"
#import "REANodesManager.h"
#import "REAValueNode.h"

@implementation REACallbackNode  {
    NSNumber *_whatNodeID;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _whatNodeID = config[@"what"];
    }
    return self;
}
/*
- (RCTResponseSenderBlock)cb:(NSArray *response)
{
    [self setValue:response]
}

- (RCTResponseErrorBlock)cb:(NSError *error)
{
    NSLog(@"callback error");
}

- (RCTPromiseResolveBlock)cb:(id result)
{
    [self setValue:result]
}

- (RCTPromiseRejectBlock)cb:(NSString *code, NSString *message, NSError *error)
{
    NSLog(@"callback rejection");
}
*/


- (void) bip
{
    /*
#define RCT_RETAINED_ARG_BLOCK(_logic) \
[argumentBlocks addObject:^(__unused __weak RCTBridge *bridge, NSUInteger index, id json) { \
_logic                                                                             \
[invocation setArgument:&value atIndex:(index) + 2];                               \
if (value) {                                                                       \
[retainedObjects addObject:value];                                               \
}                                                                                  \
return YES;                                                                        \
}]
    
#define __PRIMITIVE_CASE(_type, _nullable) {                                           \
isNullableType = _nullable;                                                          \
_type (*convert)(id, SEL, id) = (__typeof__(convert))objc_msgSend;                   \
[argumentBlocks addObject:^(__unused RCTBridge *bridge, NSUInteger index, id json) { \
_type value = convert([RCTConvert class], selector, json);                         \
[invocation setArgument:&value atIndex:(index) + 2];                               \
return YES;                                                                        \
}];                                                                                  \
break;                                                                               \
}
    
#define PRIMITIVE_CASE(_type) __PRIMITIVE_CASE(_type, NO)
#define NULLABLE_PRIMITIVE_CASE(_type) __PRIMITIVE_CASE(_type, YES)
    
    // Explicitly copy the block
#define __COPY_BLOCK(block...)         \
id value = [block copy];             \
if (value) {                         \
[retainedObjects addObject:value]; \
}                                    \

#if RCT_DEBUG
#define BLOCK_CASE(_block_args, _block) RCT_RETAINED_ARG_BLOCK(         \
if (json && ![json isKindOfClass:[NSNumber class]]) {                 \
RCTLogArgumentError(weakSelf, index, json, "should be a function"); \
return NO;                                                          \
}                                                                     \
__block BOOL didInvoke = NO;                                          \
__COPY_BLOCK(^_block_args {                                           \
if (checkCallbackMultipleInvocations(&didInvoke)) _block            \
});                                                                   \
)
#else
#define BLOCK_CASE(_block_args, _block) \
RCT_RETAINED_ARG_BLOCK( __COPY_BLOCK(^_block_args { _block }); )
#endif

    NSString *typeName;
    if ([typeName isEqualToString:@"RCTResponseSenderBlock"]) {
        BLOCK_CASE((NSArray *args), {
            [bridge enqueueCallback:json args:args];
        });
    } else if ([typeName isEqualToString:@"RCTResponseErrorBlock"]) {
        BLOCK_CASE((NSError *error), {
            [bridge enqueueCallback:json args:@[RCTJSErrorFromNSError(error)]];
        });
    } else if ([typeName isEqualToString:@"RCTPromiseResolveBlock"]) {
        BLOCK_CASE((id result), {
            [bridge enqueueCallback:json args:result ? @[result] : @[]];
        });
    } else if ([typeName isEqualToString:@"RCTPromiseRejectBlock"]) {
     
        RCTAssert(i == numberOfArguments - 1,
                  @"The RCTPromiseRejectBlock must be the last parameter in %@",
                  [self methodName]);
        BLOCK_CASE((NSString *code, NSString *message, NSError *error), {
            NSDictionary *errorJSON = RCTJSErrorFromCodeMessageAndNSError(code, message, error);
            [bridge enqueueCallback:json args:@[errorJSON]];
        });
    }
     */
}


@end
