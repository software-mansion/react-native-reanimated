#if __cplusplus

#import <worklets/apple/WorkletsDisplayLink.h>
#import <functional>

@interface AnimationFrameQueue : NSObject

/**
 * Creates a queue with its own display link that delivers frames on the
 * shared frame thread instead of the main thread, so they keep coming while
 * the main thread is blocked. Can be created and invalidated on any thread.
 * On macOS the frames are still delivered on the main thread.
 */
- (instancetype)initOnFrameThread;

- (void)requestAnimationFrame:(std::function<void(double)>)callback;
- (void)executeQueue:(WorkletsDisplayLink *)displayLink;

- (void)invalidate;

@end

#endif // __cplusplus
