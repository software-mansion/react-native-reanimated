#import "UpdateRecorder.h"

#include "EndpointReader.h"

using benchmark::UpdateRecord;

@implementation UpdateRecorder {
  UIUpdateLink *_link;
  std::vector<UpdateRecord> _records;
  size_t _capacity;
  BOOL _open;
  UpdateRecord _current;
}

- (instancetype)initWithWindowScene:(UIWindowScene *)windowScene capacity:(size_t)capacity
{
  if (self = [super init]) {
    _capacity = capacity;
    _records.reserve(capacity);
    _link = [UIUpdateLink updateLinkForWindowScene:windowScene];
    if (_link.requiresContinuousUpdates) {
      _error = @"the UIUpdateLink requests continuous updates, so it is not a passive observer";
    }
    __weak UpdateRecorder *weakSelf = self;
    [_link addActionToPhase:UIUpdateActionPhase.beforeCADisplayLinkDispatch
                    handler:^(UIUpdateLink *link, UIUpdateInfo *info) {
                      uint64_t now = benchmark::monotonicNs();
                      [weakSelf beginUpdateAt:now modelTime:info.modelTime];
                    }];
    [_link addActionToPhase:UIUpdateActionPhase.afterCATransactionCommit
                    handler:^(UIUpdateLink *link, UIUpdateInfo *info) {
                      uint64_t now = benchmark::monotonicNs();
                      [weakSelf endUpdateAt:now modelTime:info.modelTime];
                    }];
  }
  return self;
}

- (void)start
{
  _link.enabled = YES;
}

- (void)stop
{
  _link.enabled = NO;
  if (_open) {
    [self failWith:@"a UI update had no afterCATransactionCommit phase before the end of the epoch"];
  }
}

- (const std::vector<UpdateRecord> &)records
{
  return _records;
}

- (void)beginUpdateAt:(uint64_t)now modelTime:(NSTimeInterval)modelTime
{
  if (_error != nil) {
    return;
  }
  if (_open) {
    [self failWith:@"a UI update had no afterCATransactionCommit phase before the next update"];
    return;
  }
  _open = YES;
  _current = {now, 0, benchmark::secondsToNs(modelTime)};
}

- (void)endUpdateAt:(uint64_t)now modelTime:(NSTimeInterval)modelTime
{
  if (_error != nil) {
    return;
  }
  if (!_open) {
    [self failWith:@"a UI update had no beforeCADisplayLinkDispatch phase"];
    return;
  }
  _open = NO;
  if (benchmark::secondsToNs(modelTime) != _current.modelTimeNs) {
    [self failWith:@"the model time of a UI update changed between its phases"];
    return;
  }
  if (_records.size() == _capacity) {
    [self failWith:[NSString stringWithFormat:@"more than %zu UI updates: the buffer is full", _capacity]];
    return;
  }
  _current.endNs = now;
  _records.push_back(_current);
}

- (void)failWith:(NSString *)error
{
  _error = error;
  _link.enabled = NO;
}

@end
