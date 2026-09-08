#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

#import <jsi/jsi.h>
#import <memory>
#import <worklets/SharedItems/Serializable/SerializableWorklet.h>
#import <worklets/WorkletRuntime/WorkletRuntime.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTTouchBox : RCTViewComponentView

+ (void)setHandler:(std::shared_ptr<worklets::SerializableWorklet>)handler
     forController:(NSInteger)controllerId
         uiRuntime:(std::shared_ptr<worklets::WorkletRuntime>)uiRuntime;

@end

NS_ASSUME_NONNULL_END
