#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface REASnapshot : NSObject

@property NSMutableDictionary *values;

- (instancetype)init;
- (instancetype)init:(UIView *)view;
- (instancetype)init:(UIView *)view withConverter:(UIView *)converter withParent:(UIView *)parent;

@end

NS_ASSUME_NONNULL_END
