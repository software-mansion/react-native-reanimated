#import <worklets/Tools/FeatureFlags.h>
#import <worklets/apple/AnimationFrameQueue.h>
#import <worklets/apple/AssertJavaScriptQueue.h>
#import <worklets/apple/AssertTurboModuleManagerQueue.h>
#import <worklets/apple/SlowAnimations.h>
#import <chrono>

#import <Foundation/Foundation.h>
#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#endif // !TARGET_OS_OSX

#if TARGET_OS_OSX
#import <QuartzCore/CADisplayLink.h>
#endif // TARGET_OS_OSX

#import <React/RCTAssert.h>
#import <React/RCTUtils.h>

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
  NSThread *frameThread_;
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
  react_native_assert(
      (IsJavaScriptQueue() || RCTIsMainQueue()) &&
      "AnimationFrameQueue must be created on the JavaScript queue or the main queue");
  return [self initWithFrameThread:nil];
}

- (instancetype)initOnFrameThread
{
#if TARGET_OS_OSX
  return [self initWithFrameThread:nil];
#else // TARGET_OS_OSX
  return [self initWithFrameThread:[AnimationFrameQueue frameThread]];
#endif // TARGET_OS_OSX
}

- (void)requestAnimationFrame:(std::function<void(double)>)callback
{
  std::lock_guard<std::mutex> lock(callbacksMutex_);
  frameCallbacks_.push_back(callback);
  [self scheduleQueueExecution];
}

- (void)invalidate
{
  if (frameThread_ == nil) {
    AssertTurboModuleManagerQueue();
    [displayLink_ invalidate];
    return;
  }
  [displayLink_ performSelector:@selector(invalidate) onThread:frameThread_ withObject:nil waitUntilDone:NO];
}

#pragma mark-- private

+ (NSThread *)frameThread
{
  static NSThread *frameThread;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    frameThread = [[NSThread alloc] initWithBlock:^{
      NSRunLoop *runLoop = [NSRunLoop currentRunLoop];
      [runLoop addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode];
      while (true) {
        @autoreleasepool {
          [runLoop runMode:NSDefaultRunLoopMode beforeDate:[NSDate distantFuture]];
        }
      }
    }];
    frameThread.name = @"WorkletsFrameSource";
    frameThread.qualityOfService = NSQualityOfServiceUserInteractive;
    [frameThread start];
  });
  return frameThread;
}

- (instancetype)initWithFrameThread:(NSThread *)frameThread
{
  frameThread_ = frameThread;
  if (frameThread_ != nil) {
    displayLink_ = [WorkletsDisplayLink displayLinkWithTarget:self selector:@selector(executeQueue:)];
  } else if constexpr (worklets::StaticFeatureFlags::getFlag("IOS_DYNAMIC_FRAMERATE_ENABLED")) {
    bool supportsProMotion = false;
#if !TARGET_OS_OSX
    supportsProMotion = [UIScreen mainScreen].maximumFramesPerSecond > 60;
#endif // !TARGET_OS_OSX

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
  if (frameThread_ != nil) {
    [self performSelector:@selector(attachDisplayLinkToFrameThread)
                 onThread:frameThread_
               withObject:nil
            waitUntilDone:NO];
  } else {
    [displayLink_ addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  }
  return self;
}

- (void)attachDisplayLinkToFrameThread
{
  [displayLink_ addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
}

- (void)assertFrameThread
{
  if (frameThread_ == nil) {
    RCTAssertMainQueue();
  } else {
    react_native_assert(
        [NSThread currentThread] == frameThread_ &&
        "AnimationFrameQueue must execute its callbacks on the frame thread");
  }
}

- (void)scheduleQueueExecution
{
  [displayLink_ setPaused:FALSE];
}

- (void)executeQueue:(WorkletsDisplayLink *)displayLink
{
  [self assertFrameThread];

  auto frameCallbacks = [self pullCallbacks];

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
#if !TARGET_OS_OSX
    displayLink_.preferredFrameRateRange = frameRateRange;
#endif // !TARGET_OS_OSX
    currentFrameRate_ = frameRateRange;
  }
}

- (std::vector<std::function<void(double)>>)pullCallbacks
{
  [self assertFrameThread];
  std::lock_guard<std::mutex> lock(callbacksMutex_);
  [displayLink_ setPaused:TRUE];
  return std::move(frameCallbacks_);
}

@end
