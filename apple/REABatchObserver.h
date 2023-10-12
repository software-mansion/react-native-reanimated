@interface REABatchObserver : NSObject
@property (atomic) BOOL isActiveBatch;
- (void)onNewBatchBlockQueued;
- (NSNumber *)batchWillFlush;
- (void)batchDidFlush:(NSNumber *)batchId;
@end
