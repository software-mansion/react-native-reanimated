#include <RNReanimated/FrameCallbackManager.h>

@implementation FrameCallbackManager {
  NSNumber *_nextCallbackId;
  CADisplayLink *displayLink;
  NSMutableDictionary<NSNumber *, void (^)()> *_frameCallbackRegistry;
  NSMutableSet<NSNumber *> *_frameCallbackActive;
  Boolean isAnimationRunning;
}

- (instancetype)init
{
  self = [super init];
  _frameCallbackRegistry = [[NSMutableDictionary<NSNumber *, void (^)()> alloc] init];
  _frameCallbackActive = [NSMutableSet set];
  _nextCallbackId = @0;
  isAnimationRunning = false;
  return self;
}

- (void)runAnimation
{
  if (!isAnimationRunning) {
    displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(frameCallback)];
    [displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  }

  isAnimationRunning = true;
}

- (void)stopAnimation
{
  [displayLink invalidate];
  displayLink = nil;

  isAnimationRunning = false;
}

- (void)frameCallback
{
  for (NSNumber *key in _frameCallbackActive) {
    auto callback = _frameCallbackRegistry[key];
    [callback invoke];
  }
}

- (NSNumber *)registerFrameCallback:(void (^)())callback
{
  NSNumber *callbackId = [_nextCallbackId copy];
  _nextCallbackId = [NSNumber numberWithInt:[_nextCallbackId intValue] + 1];

  _frameCallbackRegistry[callbackId] = callback;

  return callbackId;
}

- (void)unregisterFrameCallback:(NSNumber *)frameCallbackId
{
  [self manageStateFrameCallback:frameCallbackId state:false];
  [_frameCallbackRegistry removeObjectForKey:frameCallbackId];
}

- (void)manageStateFrameCallback:(NSNumber *)frameCallbackId state:(bool)state
{
  if (state) {
    [_frameCallbackActive addObject:frameCallbackId];
    [self runAnimation];
  } else {
    [_frameCallbackActive removeObject:frameCallbackId];

    if ([_frameCallbackActive count] == 0) {
      [self stopAnimation];
    }
  }
}

@end
