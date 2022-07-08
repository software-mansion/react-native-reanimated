#include <RNReanimated/FrameCallbackManager.h>

@implementation FrameCallbackManager {
  CADisplayLink *displayLink;
  NSDictionary *_frameCallbackRegistry;
}

- (instancetype)init
{
  self = [super init];
  return self;
}

- (void)runAnimation
{
  displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(frameCallback)];
  [displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
}

- (void)stopAnimation
{
  [displayLink invalidate];
  displayLink = nil;
}

- (void)frameCallback
{
  // todo
}

- (NSNumber *)registerFrameCallback:(void (^)())callback
{
  // todo
  return @0;
}

- (void)unregisterFrameCallback:(NSNumber *)frameCallbackId
{
  // todo
}

- (void)manageStateFrameCallback:(NSNumber *)frameCallbackId state:(bool)state
{
  // todo
}

@end
