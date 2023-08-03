#import <Foundation/Foundation.h>

#import <React/RCTUIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface REASnapshot : NSObject

@property NSMutableDictionary *values;

- (instancetype)init:(RCTUIView *)view;
- (instancetype)initWithAbsolutePosition:(RCTUIView *)view;

@end

NS_ASSUME_NONNULL_END
