#import <Foundation/Foundation.h>

#if __has_include(<UIKit/UIAccessibility.h>)
#import <UIKit/UIAccessibility.h>
#endif

#if __has_include(<AppKit/AppKit.h>)
#import <AppKit/AppKit.h>
#endif

namespace reanimated {

static inline bool getIsReducedMotion() {
#if __has_include(<UIKit/UIAccessibility.h>)
  return UIAccessibilityIsReduceMotionEnabled();
#else
  return NSWorkspace.sharedWorkspace.accessibilityDisplayShouldReduceMotion;
#endif // __has_include(<UIKit/UIAccessibility.h>)
}

} // namespace reanimated
