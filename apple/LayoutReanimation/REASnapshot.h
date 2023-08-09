#import <Foundation/Foundation.h>

#import <RNReanimated/REAUIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface REASnapshot : NSObject

@property NSMutableDictionary *values;

- (instancetype)init:(RNAUIView *)view;
- (instancetype)initWithAbsolutePosition:(RNAUIView *)view;

@end

NS_ASSUME_NONNULL_END
