typedef void (^AnimationStartBlock)(CAAnimation *animation);
typedef void (^AnimationStopBlock)(CAAnimation *animation, BOOL finished);

@interface REACoreAnimationDelegate : NSObject <CAAnimationDelegate>

+ (instancetype)delegateWithStart:(nullable AnimationStartBlock)start stop:(nullable AnimationStopBlock)stop;

@end
