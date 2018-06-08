#import "REAFeedbackNode.h"
#import "REANodesManager.h"
#import <UIKit/UIKit.h>
#import <AudioToolbox/AudioToolbox.h>
#import <sys/utsname.h>

@implementation REAFeedbackNode {
  NSString *_type;
  NSString *_style;
  UIImpactFeedbackGenerator *_impactGenerator;
  UISelectionFeedbackGenerator *_selectionGenerator;
  UINotificationFeedbackGenerator *_notificationGenerator;
  
  BOOL _shouldUseAlternativeHaptic;
}
- (instancetype)initWithID:(REANodeID)nodeID
                    config:(NSDictionary<NSString *, id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _type = config[@"feedback"];
    _style = config[@"style"];
    id prop = config[@"useAlternative"];
    if (prop != nil) {
      _shouldUseAlternativeHaptic = [RCTConvert BOOL:prop];
    } else {
      _shouldUseAlternativeHaptic = YES;
    }
  }
  if (![self needsAlternativeHaptic]) {
    if ([_type isEqualToString:@"notification"]) {
      _notificationGenerator = [UINotificationFeedbackGenerator new];
      
    } else if ([_type isEqualToString:@"selection"]) {
      _selectionGenerator = [UISelectionFeedbackGenerator new];
    } else {
      if ([_style isEqualToString:@"heavy"]) {
        _impactGenerator = [[UIImpactFeedbackGenerator alloc] initWithStyle:(UIImpactFeedbackStyleHeavy)];
      } else if ([_style isEqualToString:@"light"]) {
        _impactGenerator = [[UIImpactFeedbackGenerator alloc] initWithStyle:(UIImpactFeedbackStyleLight)];
      } else {
        _impactGenerator = [[UIImpactFeedbackGenerator alloc] initWithStyle:(UIImpactFeedbackStyleMedium)];
      }
    }
  }
  return self;
}

- (BOOL)needsAlternativeHaptic {
  if (@available(iOS 11, *)) {
    struct utsname systemInfo;
    uname(&systemInfo);
    NSArray *unsupportedDevices = @[@"iPhone8,1", @"iPhone8,2"]; //iPhone 6s, 6s+
    NSString *current = [NSString stringWithCString:systemInfo.machine
                                           encoding:NSUTF8StringEncoding];
    return [unsupportedDevices containsObject:current] || [current hasPrefix:@"iPad"];
  }
  return YES;
}


- (id)evaluate {
  if([self needsAlternativeHaptic]){
    if (_shouldUseAlternativeHaptic)
      [self activateAlternativeHaptic];
    return 0;
  }
  
  if ([_type isEqualToString:@"notification"]) {
    if ([_style isEqualToString:@"error"]) {
      [_notificationGenerator notificationOccurred:UINotificationFeedbackTypeError];
    } else if ([_style isEqualToString:@"warning"]) {
      [_notificationGenerator notificationOccurred:UINotificationFeedbackTypeWarning];
    } else {
      [_notificationGenerator notificationOccurred:UINotificationFeedbackTypeSuccess];
    }
  } else if ([_type isEqualToString:@"selection"]) {
    [_selectionGenerator selectionChanged];
  } else {
    [_impactGenerator impactOccurred];
  }
  
  return 0;
}

- (void)activateAlternativeHaptic {
  if([self needsAlternativeHaptic]){
    if ([_type isEqualToString: @"impact"]) {
      AudioServicesPlaySystemSound((SystemSoundID) 1520);
    } else if ([_type isEqualToString:@"notification"]) {
      AudioServicesPlaySystemSound((SystemSoundID) 1521);
    } else if ([_type isEqualToString:@"selection"]) {
      AudioServicesPlaySystemSound((SystemSoundID) 1519);
    }
  }
}

@end


