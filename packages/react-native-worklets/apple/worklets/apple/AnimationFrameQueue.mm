#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/SlowAnimations.h>

@implementation AnimationFrameQueue {
  /* DisplayLink is thread safe. */
  WorkletsDisplayLink *displayLink_;
  std::vector<std::function<void(double)>> frameCallbacks_;
  std::mutex callbacksMutex_;
}

typedef void (^AnimationFrameCallback)(WorkletsDisplayLink *displayLink);

#pragma mark-- public

- (instancetype)init
{
  displayLink_ = [WorkletsDisplayLink displayLinkWithTarget:self selector:@selector(executeQueue:)];
#if TARGET_OS_OSX
  // nothing
#else // TARGET_OS_OSX
  displayLink_.preferredFramesPerSecond = 120; // will fallback to 60 fps for devices without Pro Motion display
#endif // TARGET_OS_OSX
  [displayLink_ setPaused:TRUE];
  [displayLink_ addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  return self;
}

- (void)requestAnimationFrame:(std::function<void(double)>)callback
{
  {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    frameCallbacks_.push_back(callback);
  }
  [self scheduleQueueExecution];
}

- (void)invalidate
{
  [displayLink_ invalidate];
}

#pragma mark-- private

- (void)scheduleQueueExecution
{
  [displayLink_ setPaused:FALSE];
}

- (void)executeQueue:(WorkletsDisplayLink *)displayLink
{
  auto frameCallbacks = [self pullCallbacks];
  [displayLink_ setPaused:TRUE];

#if TARGET_OS_OSX
  auto targetTimestamp = displayLink.timestamp + displayLink.duration;
#else // TARGET_OS_OSX
  auto targetTimestamp = displayLink.targetTimestamp;
#endif // TARGET_OS_OSX
  targetTimestamp = worklets::calculateTimestampWithSlowAnimations(targetTimestamp);

  for (auto callback : frameCallbacks) {
    callback(targetTimestamp);
  }
}

- (std::vector<std::function<void(double)>>)pullCallbacks
{
  std::lock_guard<std::mutex> lock(callbacksMutex_);
  return std::move(frameCallbacks_);
}

@end
