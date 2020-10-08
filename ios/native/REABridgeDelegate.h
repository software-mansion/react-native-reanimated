#import <Foundation/Foundation.h>
#import <React/RCTCxxBridgeDelegate.h>

NS_ASSUME_NONNULL_BEGIN

@interface REABridgeDelegate : NSObject <RCTCxxBridgeDelegate>

- (instancetype)initWithDelegate:(id<RCTBridgeDelegate>)delegate;

@end

NS_ASSUME_NONNULL_END
