#import <worklets/Tools/FeatureFlags.h>
#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/AssertTurboModuleManagerQueue.h>
#import <worklets/apple/SlowAnimations.h>
#import <chrono>

#import <React/RCTAssert.h>

constexpr auto TIME_SAMPLES_AMOUNT = 4;

namespace FrameRateRange {
const auto BEST = CAFrameRateRangeMake(60, 120, 120);
const auto STANDARD = CAFrameRateRangeMake(30, 60, 60);
const auto LOW = CAFrameRateRangeMake(24, 30, 30);
const auto POOR = CAFrameRateRangeMake(10, 24, 24);
} // namespace FrameRateRange

@implementation AnimationFrameQueue {
  /* DisplayLink is thread safe. */
  WorkletsDisplayLink *displayLink_;
  std::vector<std::function<void(double)>> frameCallbacks_;
  std::mutex callbacksMutex_;
  std::chrono::duration<double, std::milli> timeDeltas_[TIME_SAMPLES_AMOUNT];
  int timeDeltaIndex_;
  CAFrameRateRange currentFrameRate_;
}

typedef void (^AnimationFrameCallback)(WorkletsDisplayLink *displayLink);

#pragma mark-- public

- (instancetype)init
{
  AssertJavaScriptQueue();
  if constexpr (worklets::StaticFeatureFlags::getFlag("IOS_DYNAMIC_FRAMERATE_ENABLED")) {
    bool supportsProMotion = [UIScreen mainScreen].maximumFramesPerSecond > 60;
    SEL frameCallback = supportsProMotion ? @selector(executeQueueForProMotion:) : @selector(executeQueue:);
    currentFrameRate_ = supportsProMotion ? FrameRateRange::BEST : FrameRateRange::STANDARD;
    displayLink_ = [WorkletsDisplayLink displayLinkWithTarget:self selector:frameCallback];
  } else {
    displayLink_ = [WorkletsDisplayLink displayLinkWithTarget:self selector:@selector(executeQueue:)];
  }

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
  if (timeDeltaIndex_ == TIME_SAMPLES_AMOUNT) {
    // Perform this on every TIME_SAMPLES_AMOUNT-nth frame instead of each one
    return;
  }
  float averageComputationTime = 0;
  for (int i = 0; i < TIME_SAMPLES_AMOUNT; i++) {
    averageComputationTime += timeDeltas_[i].count();
  }
  averageComputationTime = averageComputationTime / TIME_SAMPLES_AMOUNT;
  CAFrameRateRange frameRateRange;
  if (averageComputationTime < 8) {
    frameRateRange = FrameRateRange::BEST;
  } else if (averageComputationTime < 16) {
    frameRateRange = FrameRateRange::STANDARD;
  } else if (averageComputationTime < 33) {
    frameRateRange = FrameRateRange::LOW;
  } else {
    frameRateRange = FrameRateRange::POOR;
  }
  if (currentFrameRate_.preferred != frameRateRange.preferred) {
    displayLink_.preferredFrameRateRange = frameRateRange;
    currentFrameRate_ = frameRateRange;
  }
}

- (std::vector<std::function<void(double)>>)pullCallbacks
{
  RCTAssertMainQueue();
  std::lock_guard<std::mutex> lock(callbacksMutex_);
  return std::move(frameCallbacks_);
}

@end
