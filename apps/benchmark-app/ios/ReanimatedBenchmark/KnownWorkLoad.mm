#import "KnownWorkLoad.h"

#include <atomic>
#include <cstdint>
#include <optional>

#if !defined(__arm64__)
#error "The known-work unit has an instruction count only for arm64"
#endif

namespace {

struct KnownWorkPlan {
  NSUInteger units;
  NSQualityOfService quality;
  bool parksUntilFinish;
};

struct NamedPlan {
  NSString *load;
  KnownWorkPlan plan;
};

const NSUInteger KnownWorkUnits = 1000;

const uint64_t KnownWorkIterations = 1'000'000;

const uint64_t KnownWorkChecksum = KnownWorkIterations * (KnownWorkIterations + 1) / 2;

const NamedPlan KnownWorkPlans[] = {
    {@"known-work", {KnownWorkUnits, NSQualityOfServiceUserInteractive, true}},
    {@"known-work-double", {2 * KnownWorkUnits, NSQualityOfServiceUserInteractive, true}},
    {@"known-work-background", {KnownWorkUnits, NSQualityOfServiceBackground, true}},
    {@"known-work-ended", {KnownWorkUnits, NSQualityOfServiceUserInteractive, false}},
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
  dispatch_semaphore_t _release;
  dispatch_semaphore_t _done;
  BOOL _running;
  std::atomic<bool> _counting;
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
  dispatch_semaphore_t release = dispatch_semaphore_create(0);
  dispatch_semaphore_t done = dispatch_semaphore_create(0);
  _release = release;
  _done = done;
  _running = YES;
  _counting = true;
  NSThread *thread = [[NSThread alloc] initWithBlock:^{
    [self runUnits:plan.units ofLoad:load];
    if (plan.parksUntilFinish) {
      dispatch_semaphore_wait(release, DISPATCH_TIME_FOREVER);
    }
    dispatch_semaphore_signal(done);
  }];
  thread.qualityOfService = plan.quality;
  [thread start];
}

- (void)stopCounting
{
  _counting = false;
}

- (void)finish
{
  if (!_running) {
    return;
  }
  _counting = false;
  dispatch_semaphore_signal(_release);
  dispatch_semaphore_wait(_done, DISPATCH_TIME_FOREVER);
  _running = NO;
}

- (void)runUnits:(NSUInteger)units ofLoad:(NSString *)load
{
  for (NSUInteger unit = 0; unit < units && _counting.load(); unit++) {
    uint64_t checksum = benchmarkKnownWorkUnit();
    if (checksum != KnownWorkChecksum) {
      _wrongChecksum = checksum;
      _checksumFailed = true;
      return;
    }
    if (_counting.load()) {
      _onUnit(load);
    }
  }
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
