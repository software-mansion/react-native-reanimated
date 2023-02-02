#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface REASnapshot : NSObject

@property NSMutableDictionary *values;

- (instancetype)init:(UIView *)view;
- (instancetype)init:(UIView *)view withParent:(UIView *)parent;

@end

NS_ASSUME_NONNULL_END
