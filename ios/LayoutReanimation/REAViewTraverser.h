#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface REAViewTraverser : NSObject

+ (void)traverse:(UIView*)view withBlock:(void (^)(UIView*))block shouldSkipAnimationRoots:(BOOL)shouldSkipAnimationRoots depth:(int)depth;

+ (void)traverse:(UIView*)view withBlock:(void (^)(UIView*))block;

@end

NS_ASSUME_NONNULL_END
