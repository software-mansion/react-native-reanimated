#include <RNReanimated/FrameCallbackManager.h>

@implementation FrameCallbackManager {
  NSNumber *_nextCallbackId;
  CADisplayLink *displayLink;
  NSMutableDictionary *_frameCallbackRegistry;
  NSMutableSet<NSNumber *> *_frameCallbackActive;
}

- (instancetype)init
{
  self = [super init];
  _frameCallbackRegistry = [[NSMutableDictionary<NSNumber *, void (^)()> alloc] init];
  _frameCallbackActive = [NSMutableSet set];
  _nextCallbackId = @0;
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
  for (NSNumber *key in _frameCallbackActive) {
    auto callback = _frameCallbackRegistry[key];
    [callback invoke];
  }
}

- (NSNumber *)registerFrameCallback:(void (^)())callback
{
  NSNumber *callbackId = [_nextCallbackId copy];
  _nextCallbackId = [NSNumber numberWithInt:[_nextCallbackId intValue] + 1];

  [_frameCallbackRegistry setObject:callback forKey:callbackId];

  return callbackId;
}

- (void)unregisterFrameCallback:(NSNumber *)frameCallbackId
{
  [self manageStateFrameCallback:frameCallbackId state:false];

  [_frameCallbackRegistry removeObjectForKey:frameCallbackId];
  [_frameCallbackActive removeObject:frameCallbackId];

  if ([_frameCallbackActive count] == 0)
    [self stopAnimation];
}

- (void)manageStateFrameCallback:(NSNumber *)frameCallbackId state:(bool)state
{
  if (state) {
    [_frameCallbackActive addObject:frameCallbackId];
    if ([_frameCallbackActive count] == 1)
      [self runAnimation];
  } else {
    [_frameCallbackActive removeObject:frameCallbackId];
    if ([_frameCallbackActive count] == 0)
      [self stopAnimation];
  }
}

@end
