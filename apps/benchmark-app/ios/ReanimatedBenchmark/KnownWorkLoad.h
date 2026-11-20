#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

FOUNDATION_EXTERN uint64_t benchmarkKnownWorkUnit(void);

@interface KnownWorkLoad : NSObject

@property (nonatomic, readonly, nullable) NSString *error;

+ (BOOL)isKnownWorkLoad:(NSString *)load;

- (instancetype)initWithOnUnit:(void (^)(NSString *load))onUnit;

- (void)startLoad:(NSString *)load;

- (void)stopCounting;

- (void)finish;

@end

NS_ASSUME_NONNULL_END
