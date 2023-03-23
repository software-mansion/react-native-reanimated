#ifdef __cplusplus
#import <RNReanimated/JSCallbacksManager.h>
#endif

typedef void (^ OnTransitionProgressCallbackBlock)();

@interface REASharedTransitionManagerPublic : NSObject {
  @protected
  NSMutableDictionary<NSNumber *, OnTransitionProgressCallbackBlock> *onTransitionProgressCallbackBlocks;
//  @public
//  reanimated::JSCallbacksManager *jsCallbacksManager;
}

#ifdef __cplusplus
@property reanimated::JSCallbacksManager *jsCallbacksManager;
#endif
- (void)registerTransitionProgressCallback:(OnTransitionProgressCallbackBlock)onTransitionProgressCallbackBlock withViewTag:(NSNumber *)viewTag;

@end
