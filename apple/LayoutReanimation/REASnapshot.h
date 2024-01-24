#import <Foundation/Foundation.h>
#import <RNReanimated/REAUIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface REASnapshot : NSObject

@property NSMutableDictionary *values;

- (instancetype)init:(REAUIView *)view;
- (instancetype)initWithAbsolutePosition:(REAUIView *)view;
- (instancetype)initWithAbsolutePosition:(REAUIView *)view withOffsetX:(double)offsetX withOffsetY:(double)offsetY;

@end

NS_ASSUME_NONNULL_END
