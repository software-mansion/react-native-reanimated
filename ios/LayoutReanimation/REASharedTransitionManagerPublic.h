
typedef void (^ OnTransitionProgressCallbackBlock)();

@interface REASharedTransitionManagerPublic : NSObject {
  @protected
  NSMutableDictionary<NSNumber *, OnTransitionProgressCallbackBlock> *onTransitionProgressCallbackBlocks;
}

- (void)registerTransitionProgressCallback:(OnTransitionProgressCallbackBlock)onTransitionProgressCallbackBlock withViewTag:(NSNumber *)viewTag;

@end
