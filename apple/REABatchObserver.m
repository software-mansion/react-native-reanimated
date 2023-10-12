#import <RNReanimated/REABatchObserver.h>
#import <React/RCTUIManagerUtils.h>

@implementation REABatchObserver {
  NSNumber *_activeBatchId;
  NSMutableSet<NSNumber *> *_scheduledBatchesIds;
}

- (instancetype)init
{
  self = [super init];
  _isActiveBatch = NO;
  _activeBatchId = @(0);
  _scheduledBatchesIds = [NSMutableSet<NSNumber *> new];
  return self;
}

- (void)onNewBatchBlockQueued
{
  RCTAssertUIManagerQueue();
  @synchronized(self) {
    if (![_scheduledBatchesIds containsObject:_activeBatchId]) {
      self.isActiveBatch = YES;
      [_scheduledBatchesIds addObject:_activeBatchId];
    }
  }
}

- (NSNumber *)batchWillFlush
{
  RCTAssertUIManagerQueue();
  @synchronized(self) {
    NSNumber *activeBatchId = _activeBatchId;
    _activeBatchId = @([_activeBatchId intValue] + 1);
    return activeBatchId;
  }
}

- (void)batchDidFlush:(NSNumber *)batchId
{
  @synchronized(self) {
    [_scheduledBatchesIds removeObject:batchId];
    if ([_scheduledBatchesIds count] == 0) {
      self.isActiveBatch = NO;
    }
  }
}

@end
