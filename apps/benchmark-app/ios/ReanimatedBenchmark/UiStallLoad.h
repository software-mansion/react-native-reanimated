#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface UiStallLoad : NSObject

- (instancetype)initWithBusyMilliseconds:(double)busyMilliseconds onUnit:(void (^)(void))onUnit;

- (void)start;

- (void)stop;

@end

NS_ASSUME_NONNULL_END
