#import <worklets/apple/SlowAnimations.h>
#import <worklets/apple/VSyncAsyncQueue.h>
#import <worklets/apple/WorkletsDisplayLink.h>

#import <Foundation/Foundation.h>
#import <QuartzCore/QuartzCore.h>

#import <memory>
#import <mutex>
#import <string>
#import <utility>
#import <vector>

namespace worklets {

struct AppleVSyncAsyncQueueState {
  std::mutex mutex;
  bool running = true;
  uint64_t generation = 0;
  CFRunLoopRef runLoop = nullptr;
  WorkletsDisplayLink *displayLink = nil;
  std::vector<std::function<void(double)>> frameCallbacks;

  ~AppleVSyncAsyncQueueState()
  {
    if (runLoop != nullptr) {
      CFRelease(runLoop);
    }
  }
};

} // namespace worklets

using worklets::AppleVSyncAsyncQueueState;

@interface WorkletsVSyncQueueFrameTarget : NSObject

- (instancetype)initWithState:(std::shared_ptr<AppleVSyncAsyncQueueState>)state;

- (void)onFrame:(WorkletsDisplayLink *)displayLink;

@end

@implementation WorkletsVSyncQueueFrameTarget {
  std::shared_ptr<AppleVSyncAsyncQueueState> state_;
}

- (instancetype)initWithState:(std::shared_ptr<AppleVSyncAsyncQueueState>)state
{
  if (self = [super init]) {
    state_ = std::move(state);
  }
  return self;
}

- (void)onFrame:(WorkletsDisplayLink *)displayLink
{
  std::vector<std::function<void(double)>> frameCallbacks;
  CFRunLoopRef runLoop;
  {
    std::lock_guard<std::mutex> lock(state_->mutex);
    if (!state_->running) {
      return;
    }
    frameCallbacks = std::move(state_->frameCallbacks);
    state_->frameCallbacks.clear();
    [state_->displayLink setPaused:YES];
    runLoop = state_->runLoop;
  }

#if TARGET_OS_OSX
  auto targetTimestamp = displayLink.timestamp + displayLink.duration;
#else // TARGET_OS_OSX
  auto targetTimestamp = displayLink.targetTimestamp;
#endif // TARGET_OS_OSX
  const double timestampMs = worklets::calculateTimestampWithSlowAnimations(targetTimestamp);

  auto runCallbacks = [frameCallbacks = std::move(frameCallbacks), timestampMs]() {
    for (const auto &callback : frameCallbacks) {
      callback(timestampMs);
    }
  };
  if (CFRunLoopGetCurrent() == runLoop) {
    runCallbacks();
    return;
  }
  CFRunLoopPerformBlock(runLoop, kCFRunLoopDefaultMode, ^{
    @autoreleasepool {
      runCallbacks();
    }
  });
  CFRunLoopWakeUp(runLoop);
}

@end

namespace worklets {

namespace {

bool isRunning(const std::shared_ptr<AppleVSyncAsyncQueueState> &state)
{
  std::lock_guard<std::mutex> lock(state->mutex);
  return state->running;
}

} // namespace

AppleVSyncAsyncQueue::AppleVSyncAsyncQueue(const std::string &name)
    : state_(std::make_shared<AppleVSyncAsyncQueueState>())
{
  const auto state = state_;
  dispatch_semaphore_t ready = dispatch_semaphore_create(0);
  NSThread *thread = [[NSThread alloc] initWithBlock:^{
    NSRunLoop *runLoop = [NSRunLoop currentRunLoop];
    [runLoop addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode];

    WorkletsDisplayLink *displayLink =
        [WorkletsDisplayLink displayLinkWithTarget:[[WorkletsVSyncQueueFrameTarget alloc] initWithState:state]
                                          selector:@selector(onFrame:)];
#if TARGET_OS_OSX
    [displayLink setPaused:YES];
    [displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
#else // TARGET_OS_OSX
    displayLink.preferredFramesPerSecond = 120;
    [displayLink setPaused:YES];
    [displayLink addToRunLoop:runLoop forMode:NSDefaultRunLoopMode];
#endif // TARGET_OS_OSX

    {
      std::lock_guard<std::mutex> lock(state->mutex);
      state->runLoop = CFRunLoopGetCurrent();
      CFRetain(state->runLoop);
      state->displayLink = displayLink;
    }
    dispatch_semaphore_signal(ready);

    while (isRunning(state)) {
      @autoreleasepool {
        CFRunLoopRunInMode(kCFRunLoopDefaultMode, [[NSDate distantFuture] timeIntervalSinceNow], false);
      }
    }
  }];
  thread.name = [NSString stringWithUTF8String:name.c_str()];
  thread.qualityOfService = NSQualityOfServiceUserInteractive;
  [thread start];
  dispatch_semaphore_wait(ready, DISPATCH_TIME_FOREVER);
}

AppleVSyncAsyncQueue::~AppleVSyncAsyncQueue()
{
  stop(defaultToken);
}

void AppleVSyncAsyncQueue::push(std::function<void()> &&job)
{
  uint64_t generation;
  CFRunLoopRef runLoop;
  {
    std::lock_guard<std::mutex> lock(state_->mutex);
    if (!state_->running) [[unlikely]] {
      return;
    }
    generation = state_->generation;
    runLoop = state_->runLoop;
  }
  auto state = state_;
  auto pendingJob = std::move(job);
  CFRunLoopPerformBlock(runLoop, kCFRunLoopDefaultMode, ^{
    {
      std::lock_guard<std::mutex> lock(state->mutex);
      if (!state->running || state->generation != generation) {
        return;
      }
    }
    @autoreleasepool {
      pendingJob();
    }
  });
  CFRunLoopWakeUp(runLoop);
}

void AppleVSyncAsyncQueue::abortPending(AbortToken /* abortToken */)
{
  std::vector<std::function<void(double)>> pendingFrameCallbacks;
  std::lock_guard<std::mutex> lock(state_->mutex);
  state_->generation++;
  std::swap(pendingFrameCallbacks, state_->frameCallbacks);
  [state_->displayLink setPaused:YES];
}

void AppleVSyncAsyncQueue::stop(AbortToken abortToken)
{
  CFRunLoopRef runLoop;
  {
    std::lock_guard<std::mutex> lock(state_->mutex);
    if (!state_->running) {
      return;
    }
    state_->running = false;
    runLoop = state_->runLoop;
  }
  abortPending(abortToken);
  auto state = state_;
  CFRunLoopPerformBlock(runLoop, kCFRunLoopDefaultMode, ^{
    WorkletsDisplayLink *displayLink;
    {
      std::lock_guard<std::mutex> lock(state->mutex);
      displayLink = state->displayLink;
      state->displayLink = nil;
    }
#if TARGET_OS_OSX
    dispatch_async(dispatch_get_main_queue(), ^{ [displayLink invalidate]; });
#else // TARGET_OS_OSX
    [displayLink invalidate];
#endif // TARGET_OS_OSX
    CFRunLoopStop(CFRunLoopGetCurrent());
  });
  CFRunLoopWakeUp(runLoop);
}

void AppleVSyncAsyncQueue::requestAnimationFrame(std::function<void(double)> &&callback)
{
  std::lock_guard<std::mutex> lock(state_->mutex);
  if (!state_->running) [[unlikely]] {
    return;
  }
  state_->frameCallbacks.push_back(std::move(callback));
  [state_->displayLink setPaused:NO];
}

} // namespace worklets
