#import <UIKit/UIKit.h>

@protocol RCTSurfacePresenterStub;

NS_ASSUME_NONNULL_BEGIN

@interface BenchmarkSampler : NSObject

@property (class, nonatomic, readonly) BenchmarkSampler *sharedSampler NS_SWIFT_NAME(shared);

- (void)prepareForWindowScene:(UIWindowScene *)windowScene
                    arguments:(NSUserDefaults *)arguments NS_SWIFT_NAME(prepare(for:arguments:));

- (void)countMountsOfSurfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter;

- (uint64_t)markReadyOnJsThread;

- (NSString *)currentEpochLoad;

- (BOOL)noteWorkOfLoad:(NSString *)load;

@end

NS_ASSUME_NONNULL_END
