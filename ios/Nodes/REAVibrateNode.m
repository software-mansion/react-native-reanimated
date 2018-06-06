#import "REAVibrateNode.h"
#import "REANodesManager.h"
#import <UIKit/UIKit.h>
#import <AudioToolbox/AudioToolbox.h>

@implementation REAVibrateNode {
  UIImpactFeedbackGenerator *_impactFeedback;
  UINotificationFeedbackGenerator *_notificationFeedback;
  UISelectionFeedbackGenerator *_selectionFeedback;
}
- (instancetype)initWithID:(REANodeID)nodeID
                    config:(NSDictionary<NSString *, id> *)config
{
  return self;
}

- (id)evaluate {
  _notificationFeedback = [UINotificationFeedbackGenerator new];
  //[_notificationFeedback notificationOccurred:UINotificationFeedbackTypeWarning];
  return 0;
}

@end


