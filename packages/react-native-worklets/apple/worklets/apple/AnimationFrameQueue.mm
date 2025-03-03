#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/SlowAnimations.h>

#import <React/RCTAssert.h>

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
  AssertJavaScriptQueue();
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
  RCTAssertMainQueue();
  {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    frameCallbacks_.push_back(callback);
  }
  [self scheduleQueueExecution];
}

- (void)invalidate
{
  // Called on com.meta.react.turbomodulemanager.queue
  [displayLink_ invalidate];
}

#pragma mark-- private

- (void)scheduleQueueExecution
{
  RCTAssertMainQueue();
  [displayLink_ setPaused:FALSE];
}

- (void)executeQueue:(WorkletsDisplayLink *)displayLink
{
  RCTAssertMainQueue();

  auto frameCallbacks = [self pullCallbacks];
  [displayLink_ setPaused:TRUE];

#if TARGET_OS_OSX
  auto targetTimestamp = displayLink.timestamp + displayLink.duration;
#else // TARGET_OS_OSX
  auto targetTimestamp = displayLink.targetTimestamp;
#endif // TARGET_OS_OSX
  targetTimestamp = worklets::calculateTimestampWithSlowAnimations(targetTimestamp);

  for (const auto &callback : frameCallbacks) {
    callback(targetTimestamp);
  }
}

- (std::vector<std::function<void(double)>>)pullCallbacks
{
  RCTAssertMainQueue();
  std::lock_guard<std::mutex> lock(callbacksMutex_);
  return std::move(frameCallbacks_);
}

@end
