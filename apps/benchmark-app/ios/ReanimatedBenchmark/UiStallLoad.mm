#import "UiStallLoad.h"

#import <QuartzCore/QuartzCore.h>

#include "EndpointReader.h"

@implementation UiStallLoad {
  uint64_t _busyNs;
  void (^_onUnit)(void);
  CADisplayLink *_link;
}

- (instancetype)initWithBusyMilliseconds:(double)busyMilliseconds onUnit:(void (^)(void))onUnit
{
  if (self = [super init]) {
    _busyNs = benchmark::secondsToNs(busyMilliseconds / 1000);
    _onUnit = [onUnit copy];
  }
  return self;
}

- (void)start
{
  if (_link != nil) {
    return;
  }
  _link = [CADisplayLink displayLinkWithTarget:self selector:@selector(stall)];
  [_link addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
}

- (void)stop
{
  [_link invalidate];
  _link = nil;
}

- (void)stall
{
  uint64_t end = benchmark::monotonicNs() + _busyNs;
  while (benchmark::monotonicNs() < end) {}
  _onUnit();
}

@end
