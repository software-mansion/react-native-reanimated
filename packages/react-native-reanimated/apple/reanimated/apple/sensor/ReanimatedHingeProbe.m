#import <reanimated/apple/sensor/ReanimatedHingeProbe.h>

#import <stdatomic.h>

#if !TARGET_OS_TV && !TARGET_OS_OSX && !TARGET_OS_VISION

@interface REAHingeProbeWindow : UIWindow
@end

@implementation REAHingeProbeWindow
@end

static atomic_bool hasHinge = false;
static UIWindow *probeWindow = nil;
static NSHashTable<id<UIInteraction>> *interactions = nil;

@implementation ReanimatedHingeProbe

+ (void)load
{
#if __has_include(<UIKit/UIHingeInteraction.h>)
  if (@available(iOS 27.1, *)) {
    interactions = [NSHashTable weakObjectsHashTable];
    NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
    [center addObserverForName:UISceneWillConnectNotification
                        object:nil
                         queue:nil
                    usingBlock:^(NSNotification *notification) {
                      if (probeWindow == nil && [notification.object isKindOfClass:[UIWindowScene class]]) {
                        [self attachToScene:notification.object];
                      }
                    }];
    [center addObserverForName:UISceneDidDisconnectNotification
                        object:nil
                         queue:nil
                    usingBlock:^(NSNotification *notification) {
                      if (probeWindow.windowScene != nil && probeWindow.windowScene != notification.object) {
                        return;
                      }
                      probeWindow = nil;
                      for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
                        if (scene != notification.object && [scene isKindOfClass:[UIWindowScene class]]) {
                          [self attachToScene:(UIWindowScene *)scene];
                          return;
                        }
                      }
                    }];
  }
#endif
}

#if __has_include(<UIKit/UIHingeInteraction.h>)
+ (void)attachToScene:(UIWindowScene *)scene API_AVAILABLE(ios(27.1))
{
  probeWindow = [[REAHingeProbeWindow alloc] initWithWindowScene:scene];
  [probeWindow addInteraction:[[UIHingeInteraction alloc]
                                  initWithUpdateHandler:^(UIHingeInteraction *_, UIHingeInteractionUpdate *update) {
                                    if (update.hinge != nil) {
                                      atomic_store(&hasHinge, true);
                                    }
                                  }]];
  for (id<UIInteraction> interaction in interactions) {
    [interaction.view removeInteraction:interaction];
    [probeWindow addInteraction:interaction];
  }
}
#endif

+ (bool)hasHinge
{
  return atomic_load(&hasHinge);
}

+ (void)addInteraction:(id<UIInteraction>)interaction
{
  [interactions addObject:interaction];
  [probeWindow addInteraction:interaction];
}

+ (void)removeInteraction:(id<UIInteraction>)interaction
{
  if (interaction == nil) {
    return;
  }
  [interactions removeObject:interaction];
  [interaction.view removeInteraction:interaction];
}

@end
#endif
