#ifdef __cplusplus
#import <RNReanimated/JSCallbacksManager.h>
#import <memory>
#endif

@interface REASharedTransitionManagerPublic : NSObject {
#ifdef __cplusplus
 @public
  std::shared_ptr<reanimated::JSCallbacksManager> jsCallbacksManager;
#endif
}
@end
