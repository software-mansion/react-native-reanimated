#import "KnownWorkLoad.h"

#include <atomic>
#include <cstdint>
#include <memory>
#include <optional>
#include <variant>

#if !defined(__arm64__)
#error "The known-work unit has an instruction count only for arm64"
#endif

namespace {

struct WorkerThreads {
  NSUInteger count;
  NSQualityOfService quality;
  bool parkUntilFinish;
};

struct MainThread {};

struct KnownWorkPlan {
  NSUInteger unitsPerThread;
  std::variant<WorkerThreads, MainThread> place;
};

struct NamedPlan {
  NSString *load;
  KnownWorkPlan plan;
};

using Counting = std::shared_ptr<std::atomic<bool>>;

const NSUInteger KnownWorkUnits = 1000;

const NSUInteger ParallelThreads = 4;

const uint64_t KnownWorkIterations = 1'000'000;

const uint64_t KnownWorkChecksum = KnownWorkIterations * (KnownWorkIterations + 1) / 2;

const NamedPlan KnownWorkPlans[] = {
    {@"known-work", {KnownWorkUnits, WorkerThreads{1, NSQualityOfServiceUserInteractive, true}}},
    {@"known-work-double", {2 * KnownWorkUnits, WorkerThreads{1, NSQualityOfServiceUserInteractive, true}}},
    {@"known-work-background", {KnownWorkUnits, WorkerThreads{1, NSQualityOfServiceBackground, true}}},
    {@"known-work-ended", {KnownWorkUnits, WorkerThreads{1, NSQualityOfServiceUserInteractive, false}}},
    {@"known-work-parallel",
     {KnownWorkUnits / ParallelThreads, WorkerThreads{ParallelThreads, NSQualityOfServiceUserInteractive, true}}},
    {@"known-work-main", {KnownWorkUnits, MainThread{}}},
};

std::optional<KnownWorkPlan> planOf(NSString *load);

} // namespace

__attribute__((noinline)) uint64_t benchmarkKnownWorkUnit(void)
{
  uint64_t remaining = KnownWorkIterations;
  uint64_t checksum = 0;
  asm volatile(
      "1:\n"
      "add %x[checksum], %x[checksum], %x[remaining]\n"
      "subs %x[remaining], %x[remaining], #1\n"
      "b.ne 1b\n"
      : [checksum] "+r"(checksum), [remaining] "+r"(remaining)
      :
      : "cc");
  return checksum;
}

@implementation KnownWorkLoad {
  void (^_onUnit)(NSString *load);
  Counting _counting;
  dispatch_semaphore_t _release;
  dispatch_group_t _done;
  NSUInteger _parkedThreads;
  std::atomic<bool> _checksumFailed;
  std::atomic<uint64_t> _wrongChecksum;
}

+ (BOOL)isKnownWorkLoad:(NSString *)load
{
  return planOf(load).has_value();
}

- (instancetype)initWithOnUnit:(void (^)(NSString *load))onUnit
{
  if (self = [super init]) {
    _onUnit = [onUnit copy];
    _counting = std::make_shared<std::atomic<bool>>(false);
    _release = dispatch_semaphore_create(0);
    _done = dispatch_group_create();
  }
  return self;
}

- (nullable NSString *)error
{
  if (!_checksumFailed.load()) {
    return nil;
  }
  return [NSString stringWithFormat:@"a known-work unit gave the checksum %llu, expected %llu",
                                    _wrongChecksum.load(),
                                    KnownWorkChecksum];
}

- (void)startLoad:(NSString *)load
{
  KnownWorkPlan plan = *planOf(load);
  _counting = std::make_shared<std::atomic<bool>>(true);
  if (const auto *workers = std::get_if<WorkerThreads>(&plan.place)) {
    [self startWorkers:*workers units:plan.unitsPerThread ofLoad:load];
  } else {
    [self runUnitsOnMainQueue:plan.unitsPerThread ofLoad:load counting:_counting];
  }
}

- (void)stopCounting
{
  _counting->store(false);
}

- (void)finish
{
  _counting->store(false);
  for (NSUInteger thread = 0; thread < _parkedThreads; thread++) {
    dispatch_semaphore_signal(_release);
  }
  _parkedThreads = 0;
  dispatch_group_wait(_done, DISPATCH_TIME_FOREVER);
}

- (void)startWorkers:(WorkerThreads)workers units:(NSUInteger)units ofLoad:(NSString *)load
{
  Counting counting = _counting;
  dispatch_semaphore_t release = _release;
  dispatch_group_t done = _done;
  _parkedThreads = workers.parkUntilFinish ? workers.count : 0;
  for (NSUInteger index = 0; index < workers.count; index++) {
    dispatch_group_enter(done);
    NSThread *thread = [[NSThread alloc] initWithBlock:^{
      [self runUnits:units ofLoad:load counting:counting];
      if (workers.parkUntilFinish) {
        dispatch_semaphore_wait(release, DISPATCH_TIME_FOREVER);
      }
      dispatch_group_leave(done);
    }];
    thread.qualityOfService = workers.quality;
    [thread start];
  }
}

- (void)runUnitsOnMainQueue:(NSUInteger)units ofLoad:(NSString *)load counting:(Counting)counting
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if ([self runUnitOfLoad:load counting:counting] && units > 1) {
      [self runUnitsOnMainQueue:units - 1 ofLoad:load counting:counting];
    }
  });
}

- (void)runUnits:(NSUInteger)units ofLoad:(NSString *)load counting:(const Counting &)counting
{
  for (NSUInteger unit = 0; unit < units; unit++) {
    if (![self runUnitOfLoad:load counting:counting]) {
      return;
    }
  }
}

- (BOOL)runUnitOfLoad:(NSString *)load counting:(const Counting &)counting
{
  if (!counting->load()) {
    return NO;
  }
  uint64_t checksum = benchmarkKnownWorkUnit();
  if (checksum != KnownWorkChecksum) {
    _wrongChecksum = checksum;
    _checksumFailed = true;
    return NO;
  }
  if (counting->load()) {
    _onUnit(load);
  }
  return YES;
}

@end

namespace {

std::optional<KnownWorkPlan> planOf(NSString *load)
{
  for (const NamedPlan &named : KnownWorkPlans) {
    if ([load isEqualToString:named.load]) {
      return named.plan;
    }
  }
  return std::nullopt;
}

} // namespace
