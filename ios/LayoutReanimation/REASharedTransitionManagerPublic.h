#ifdef __cplusplus
#import <RNReanimated/JSCallbacksManager.h>
#import <RNReanimated/JSConfigManager.h>
#import <memory>
#endif

@interface REASharedTransitionManagerPublic : NSObject {
#ifdef __cplusplus
 @public
  std::shared_ptr<reanimated::JSCallbacksManager> jsCallbacksManager;
  std::shared_ptr<reanimated::JSConfigManager> jsConfigManager;
#endif
}
@end
