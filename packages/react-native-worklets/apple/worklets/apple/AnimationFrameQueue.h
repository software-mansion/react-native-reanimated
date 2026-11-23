#if __cplusplus

#import <worklets/apple/WorkletsDisplayLink.h>
#import <functional>

@interface AnimationFrameQueue : NSObject

/**
 * Creates a queue that delivers frames on its own thread instead of the main
 * thread, so they keep coming while the main thread is blocked. On macOS the
 * frames are still delivered on the main thread.
 */
- (instancetype)initOnDedicatedThread;

- (void)requestAnimationFrame:(std::function<void(double)>)callback;
- (void)executeQueue:(WorkletsDisplayLink *)displayLink;

- (void)invalidate;

@end

#endif // __cplusplus
