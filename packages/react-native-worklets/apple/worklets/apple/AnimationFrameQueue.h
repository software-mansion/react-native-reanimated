#if __cplusplus

#import <worklets/apple/WorkletsDisplayLink.h>
#import <functional>

@interface AnimationFrameQueue : NSObject

- (void)requestAnimationFrame:(std::function<void(double)>)callback;
- (void)executeQueue:(WorkletsDisplayLink *)displayLink;

- (void)invalidate;

@end

#endif // __cplusplus
