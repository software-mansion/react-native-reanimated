#import "BenchmarkSampler.h"

#import <React/RCTSurfacePresenterStub.h>
#import <os/signpost.h>

#include <algorithm>
#include <atomic>
#include <cmath>
#include <optional>
#include <vector>

#include "EndpointReader.h"
#import "MountCounter.h"
#import "UpdateRecorder.h"

using namespace benchmark;

namespace {

enum class Collector { full, endpoints };

struct Epoch {
  NSString *load;
  Collector collector;
  double seconds;
};

struct DeviceState {
  long thermal;
  long batteryLevel;
  long batteryState;
  bool lowPower;
  long brightness;
};

struct Boundary {
  CpuReading cpu;
  uint64_t signpostNs;
  uint64_t footprintKb;
  DeviceState state;
  uint64_t mounts;
  size_t updates;
};

NSString *const SampleLinePrefix = @"ReanimatedBenchmark: SAMPLE ";

const CFStringRef StartNotification = CFSTR("com.reanimatedbenchmark.start-epochs");

const int SampleFormat = 1;

const double UpdateCapacityFactor = 2;

const int NoEpoch = -1;

NSString *parseEpochs(NSString *text, std::vector<Epoch> &epochs);

void startNotified(CFNotificationCenterRef, void *observer, CFNotificationName, const void *, CFDictionaryRef);

} // namespace

@implementation BenchmarkSampler {
  BOOL _planned;
  NSString *_planError;
  std::vector<Epoch> _epochs;
  BOOL _startsOnNotification;
  UIWindowScene *_windowScene;
  ThreadHandle _uiThread;
  ThreadHandle _jsThread;
  std::optional<CpuReader> _cpuReader;
  std::atomic<bool> _readyMarked;
  std::atomic<int> _currentEpoch;
  BOOL _begun;
  UpdateRecorder *_updateRecorder;
  MountCounter *_mountCounter;
  std::vector<Boundary> _boundaries;
  long _maxThermal;
  id<NSObject> _thermalObserver;
  dispatch_source_t _epochTimer;
  os_log_t _log;
}

+ (BenchmarkSampler *)sharedSampler
{
  static BenchmarkSampler *sampler = [BenchmarkSampler new];
  return sampler;
}

- (instancetype)init
{
  if (self = [super init]) {
    _currentEpoch = NoEpoch;
  }
  return self;
}

- (void)prepareForWindowScene:(UIWindowScene *)windowScene arguments:(NSUserDefaults *)arguments
{
  NSString *plan = [arguments stringForKey:@"benchmarkEpochs"];
  if (plan == nil) {
    return;
  }
  _planned = YES;
  _windowScene = windowScene;
  _uiThread = retainCurrentThread();
  _log = os_log_create("com.reanimatedbenchmark", OS_LOG_CATEGORY_DYNAMIC_TRACING);
  UIDevice.currentDevice.batteryMonitoringEnabled = YES;
  _planError = parseEpochs(plan, _epochs) ?: [self readStart:[arguments stringForKey:@"benchmarkStart"]];
  if (_planError != nil) {
    return;
  }
  double fullSeconds = 0;
  for (const Epoch &epoch : _epochs) {
    fullSeconds += epoch.collector == Collector::full ? epoch.seconds : 0;
  }
  if (fullSeconds > 0) {
    auto capacity =
        static_cast<size_t>(std::ceil(fullSeconds * windowScene.screen.maximumFramesPerSecond * UpdateCapacityFactor));
    _updateRecorder = [[UpdateRecorder alloc] initWithWindowScene:windowScene capacity:capacity];
    _mountCounter = [MountCounter new];
  }
  _boundaries.reserve(_epochs.size() + 1);
}

- (void)countMountsOfSurfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter
{
  if (_mountCounter != nil) {
    [surfacePresenter addObserver:_mountCounter];
  }
}

- (uint64_t)markReadyOnJsThread
{
  if (!_planned || _readyMarked.exchange(true)) {
    return currentThreadId();
  }
  _jsThread = retainCurrentThread();
  dispatch_async(dispatch_get_main_queue(), ^{ [self armPlan]; });
  return _jsThread.id;
}

- (NSString *)currentEpochLoad
{
  int index = _currentEpoch.load();
  return index >= 0 && index < static_cast<int>(_epochs.size()) ? _epochs[index].load : @"none";
}

- (nullable NSString *)readStart:(nullable NSString *)start
{
  if (start == nil || [start isEqualToString:@"ready"]) {
    return nil;
  }
  if ([start isEqualToString:@"notification"]) {
    _startsOnNotification = YES;
    return nil;
  }
  return [NSString stringWithFormat:@"the start \"%@\" is not one of ready, notification", start];
}

- (void)armPlan
{
  if (_planError != nil) {
    [self reportWithError:_planError];
    return;
  }
  if (_startsOnNotification) {
    CFNotificationCenterAddObserver(
        CFNotificationCenterGetDarwinNotifyCenter(),
        (__bridge const void *)self,
        startNotified,
        StartNotification,
        nullptr,
        CFNotificationSuspensionBehaviorDeliverImmediately);
    return;
  }
  [self beginPlan];
}

- (void)beginPlan
{
  if (_begun) {
    return;
  }
  _begun = YES;
  _cpuReader.emplace(_uiThread, _jsThread);
  __weak BenchmarkSampler *weakSelf = self;
  _thermalObserver = [NSNotificationCenter.defaultCenter
      addObserverForName:NSProcessInfoThermalStateDidChangeNotification
                  object:nil
                   queue:NSOperationQueue.mainQueue
              usingBlock:^(NSNotification *notification) { [weakSelf noteThermalState]; }];
  [self crossBoundary:0];
}

- (void)crossBoundary:(size_t)index
{
  Boundary boundary{};
  NSString *error = [self readBoundary:boundary] ?: _updateRecorder.error;
  if (error != nil) {
    [self endWithError:error];
    return;
  }
  boundary.signpostNs = monotonicNs();
  os_signpost_event_emit(_log, OS_SIGNPOST_ID_EXCLUSIVE, "Boundary", "index=%zu", index);
  _boundaries.push_back(boundary);
  if (index == _epochs.size()) {
    [self endWithError:nil];
    return;
  }
  [self enterEpoch:index];
  [self crossBoundary:index + 1 after:_epochs[index].seconds];
}

- (void)crossBoundary:(size_t)index after:(double)seconds
{
  dispatch_source_t timer =
      dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, DISPATCH_TIMER_STRICT, dispatch_get_main_queue());
  dispatch_source_set_timer(
      timer, dispatch_time(DISPATCH_TIME_NOW, static_cast<int64_t>(secondsToNs(seconds))), DISPATCH_TIME_FOREVER, 0);
  dispatch_source_set_event_handler(timer, ^{
    dispatch_source_cancel(timer);
    [self crossBoundary:index];
  });
  _epochTimer = timer;
  dispatch_resume(timer);
}

- (nullable NSString *)readBoundary:(Boundary &)boundary
{
  if (auto error = _cpuReader->read(boundary.cpu)) {
    return [NSString stringWithUTF8String:error->c_str()];
  }
  auto footprint = footprintKilobytes();
  if (!footprint) {
    return @"task_info(TASK_VM_INFO) failed";
  }
  boundary.footprintKb = *footprint;
  boundary.state = [self deviceState];
  boundary.mounts = _mountCounter.count;
  boundary.updates = _updateRecorder == nil ? 0 : [_updateRecorder records].size();
  _maxThermal = std::max(_maxThermal, boundary.state.thermal);
  return nil;
}

- (DeviceState)deviceState
{
  UIDevice *device = UIDevice.currentDevice;
  NSProcessInfo *process = NSProcessInfo.processInfo;
  return {
      static_cast<long>(process.thermalState),
      std::lround(device.batteryLevel * 100),
      static_cast<long>(device.batteryState),
      static_cast<bool>(process.lowPowerModeEnabled),
      std::lround(_windowScene.screen.brightness * 100),
  };
}

- (void)noteThermalState
{
  _maxThermal = std::max(_maxThermal, static_cast<long>(NSProcessInfo.processInfo.thermalState));
}

- (void)enterEpoch:(size_t)index
{
  if (_epochs[index].collector == Collector::full) {
    [_updateRecorder start];
  } else {
    [_updateRecorder stop];
  }
  _currentEpoch = static_cast<int>(index);
}

- (void)endWithError:(nullable NSString *)error
{
  [_updateRecorder stop];
  [NSNotificationCenter.defaultCenter removeObserver:_thermalObserver];
  _currentEpoch = static_cast<int>(_epochs.size());
  [self reportWithError:error ?: _updateRecorder.error];
}

- (void)reportWithError:(nullable NSString *)error
{
  NSDictionary *report = @{
    @"format" : @(SampleFormat),
    @"error" : error ?: NSNull.null,
    @"mainThread" : @(_uiThread.id),
    @"jsThread" : @(_jsThread.id),
    @"maxThermal" : @(_maxThermal),
    @"epochs" : [self epochsJson],
    @"boundaries" : [self boundariesJson],
    @"updates" : [self updatesJson],
  };
  NSData *json = [NSJSONSerialization dataWithJSONObject:report options:0 error:nil];
  NSMutableData *line = [[SampleLinePrefix dataUsingEncoding:NSUTF8StringEncoding] mutableCopy];
  [line appendData:json];
  [line appendBytes:"\n" length:1];
  fwrite(line.bytes, 1, line.length, stdout);
  fflush(stdout);
}

- (NSArray *)epochsJson
{
  NSMutableArray *epochs = [NSMutableArray arrayWithCapacity:_epochs.size()];
  for (const Epoch &epoch : _epochs) {
    [epochs addObject:@{
      @"load" : epoch.load,
      @"collector" : epoch.collector == Collector::full ? @"full" : @"endpoints",
      @"seconds" : @(epoch.seconds),
    }];
  }
  return epochs;
}

- (int64_t)sinceOrigin:(uint64_t)ns
{
  return static_cast<int64_t>(ns - _boundaries.front().cpu.readStartNs);
}

- (NSArray *)boundariesJson
{
  NSMutableArray *boundaries = [NSMutableArray arrayWithCapacity:_boundaries.size()];
  for (const Boundary &boundary : _boundaries) {
    [boundaries addObject:@{
      @"readStartNs" : @([self sinceOrigin:boundary.cpu.readStartNs]),
      @"readEndNs" : @([self sinceOrigin:boundary.cpu.readEndNs]),
      @"signpostNs" : @([self sinceOrigin:boundary.signpostNs]),
      @"uiThreadCpuUs" : @(boundary.cpu.uiThreadCpuUs),
      @"jsThreadCpuUs" : @(boundary.cpu.jsThreadCpuUs),
      @"processCpuUs" : @(boundary.cpu.processCpuUs),
      @"footprintKb" : @(boundary.footprintKb),
      @"thermal" : @(boundary.state.thermal),
      @"batteryLevel" : @(boundary.state.batteryLevel),
      @"batteryState" : @(boundary.state.batteryState),
      @"lowPower" : @(boundary.state.lowPower),
      @"brightness" : @(boundary.state.brightness),
      @"mounts" : @(boundary.mounts),
      @"updates" : @(boundary.updates),
    }];
  }
  return boundaries;
}

- (NSDictionary *)updatesJson
{
  NSMutableArray *begin = [NSMutableArray array];
  NSMutableArray *end = [NSMutableArray array];
  NSMutableArray *modelTime = [NSMutableArray array];
  if (_updateRecorder != nil) {
    for (const UpdateRecord &record : [_updateRecorder records]) {
      [begin addObject:@([self sinceOrigin:record.beginNs])];
      [end addObject:@([self sinceOrigin:record.endNs])];
      [modelTime addObject:@([self sinceOrigin:record.modelTimeNs])];
    }
  }
  return @{@"beginNs" : begin, @"endNs" : end, @"modelTimeNs" : modelTime};
}

@end

namespace {

NSString *parseEpoch(NSString *text, std::vector<Epoch> &epochs)
{
  NSArray<NSString *> *parts = [text componentsSeparatedByString:@":"];
  if (parts.count != 3 || parts[0].length == 0) {
    return [NSString stringWithFormat:@"the epoch \"%@\" is not <load>:<collector>:<seconds>", text];
  }
  Collector collector;
  if ([parts[1] isEqualToString:@"full"]) {
    collector = Collector::full;
  } else if ([parts[1] isEqualToString:@"endpoints"]) {
    collector = Collector::endpoints;
  } else {
    return
        [NSString stringWithFormat:@"the epoch \"%@\" has the collector \"%@\", not full or endpoints", text, parts[1]];
  }
  NSScanner *scanner = [NSScanner scannerWithString:parts[2]];
  double seconds = 0;
  if (![scanner scanDouble:&seconds] || !scanner.isAtEnd || !(seconds > 0)) {
    return [NSString stringWithFormat:@"the epoch \"%@\" has no positive number of seconds", text];
  }
  epochs.push_back({parts[0], collector, seconds});
  return nil;
}

NSString *parseEpochs(NSString *text, std::vector<Epoch> &epochs)
{
  for (NSString *item in [text componentsSeparatedByString:@","]) {
    if (NSString *error = parseEpoch(item, epochs)) {
      return error;
    }
  }
  return nil;
}

void startNotified(
    CFNotificationCenterRef center,
    void *observer,
    CFNotificationName name,
    const void *,
    CFDictionaryRef)
{
  CFNotificationCenterRemoveObserver(center, observer, name, nullptr);
  BenchmarkSampler *sampler = (__bridge BenchmarkSampler *)observer;
  dispatch_async(dispatch_get_main_queue(), ^{ [sampler beginPlan]; });
}

} // namespace
