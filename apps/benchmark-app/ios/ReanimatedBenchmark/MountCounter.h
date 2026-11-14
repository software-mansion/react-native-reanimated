#import <React/RCTSurfacePresenterStub.h>

NS_ASSUME_NONNULL_BEGIN

@interface MountCounter : NSObject <RCTSurfacePresenterObserver>

@property (nonatomic, readonly) uint64_t count;

@end

NS_ASSUME_NONNULL_END
