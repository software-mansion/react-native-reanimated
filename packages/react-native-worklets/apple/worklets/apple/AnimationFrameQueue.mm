#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/AssertTurboModuleManagerQueue.h>
#import <worklets/apple/SlowAnimations.h>
#import <chrono>

#import <React/RCTAssert.h>

#define TIME_SAMPLES_AMOUNT 3

namespace FrameRateRange {
  const CAFrameRateRange BEST = CAFrameRateRangeMake(60, 120, 120);
  const CAFrameRateRange STANDARD = CAFrameRateRangeMake(30, 60, 60);
  const CAFrameRateRange LOW = CAFrameRateRangeMake(24, 30, 30);
  const CAFrameRateRange POOR = CAFrameRateRangeMake(10, 24, 24);
}

enum FrameRateRangeEnum {
  BEST, STANDARD, LOW, POOR,
};

@implementation AnimationFrameQueue {
  /* DisplayLink is thread safe. */
  WorkletsDisplayLink *displayLink_;
  std::vector<std::function<void(double)>> frameCallbacks_;
  std::mutex callbacksMutex_;
  std::chrono::duration<double, std::milli> timeDeltas_[TIME_SAMPLES_AMOUNT];
  int timeDeltaIndex_;
  FrameRateRangeEnum curentFrameRate;
}

typedef void (^AnimationFrameCallback)(WorkletsDisplayLink *displayLink);

#pragma mark-- public

- (instancetype)init
{
  AssertJavaScriptQueue();
  bool supportsProMotion = [UIScreen mainScreen].maximumFramesPerSecond > 60;
  SEL frameCallback = supportsProMotion ? @selector(executeQueueForProMotion:) : @selector(executeQueue:);
  curentFrameRate = supportsProMotion ? BEST : STANDARD;
  displayLink_ = [WorkletsDisplayLink displayLinkWithTarget:self selector:frameCallback];
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
  AssertTurboModuleManagerQueue();
  [displayLink_ invalidate];
}

#pragma mark-- private

- (void)scheduleQueueExecution
{
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

- (void)executeQueueForProMotion:(WorkletsDisplayLink *)displayLink
{
  auto start = std::chrono::high_resolution_clock::now();

  [self executeQueue:displayLink];

  timeDeltaIndex_ = (timeDeltaIndex_ + 1) % TIME_SAMPLES_AMOUNT;
  timeDeltas_[timeDeltaIndex_] = std::chrono::high_resolution_clock::now() - start;
  float averageFrameDuration = 0;
  for (int i = 0; i < TIME_SAMPLES_AMOUNT; i++) {
    averageFrameDuration += timeDeltas_[i].count();
  }
  averageFrameDuration = averageFrameDuration / TIME_SAMPLES_AMOUNT;
  if (averageFrameDuration < 8 && curentFrameRate != BEST) {
    displayLink_.preferredFrameRateRange = FrameRateRange::BEST;
  } else if (averageFrameDuration < 16 && curentFrameRate != STANDARD) {
    displayLink_.preferredFrameRateRange = FrameRateRange::STANDARD;
  } else if (averageFrameDuration < 33 && curentFrameRate != LOW) {
    displayLink_.preferredFrameRateRange = FrameRateRange::LOW;
  } else if (curentFrameRate != POOR) {
    displayLink_.preferredFrameRateRange = FrameRateRange::POOR;
  }
}

- (std::vector<std::function<void(double)>>)pullCallbacks
{
  RCTAssertMainQueue();
  std::lock_guard<std::mutex> lock(callbacksMutex_);
  return std::move(frameCallbacks_);
}

@end
