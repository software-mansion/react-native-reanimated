#import <PolledCounterSpec/PolledCounterSpec.h>

#include <atomic>

@interface PolledCounter : NSObject <NativePolledCounterSpec>
@end

@implementation PolledCounter {
  std::atomic<int> _count;
  dispatch_source_t _timer;
}

+ (NSString *)moduleName
{
  return @"PolledCounter";
}

- (instancetype)init
{
  if (self = [super init]) {
    _timer = dispatch_source_create(
        DISPATCH_SOURCE_TYPE_TIMER, 0, 0, dispatch_get_global_queue(QOS_CLASS_USER_INTERACTIVE, 0));
    dispatch_source_set_timer(_timer, DISPATCH_TIME_NOW, 16 * NSEC_PER_MSEC, 0);
    __weak PolledCounter *weakSelf = self;
    dispatch_source_set_event_handler(_timer, ^{ [weakSelf increment]; });
    dispatch_resume(_timer);
  }
  return self;
}

- (void)increment
{
  _count += 1;
}

- (NSNumber *)getCount
{
  return @(_count.load());
}

- (void)invalidate
{
  dispatch_source_cancel(_timer);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativePolledCounterSpecJSI>(params);
}

@end
