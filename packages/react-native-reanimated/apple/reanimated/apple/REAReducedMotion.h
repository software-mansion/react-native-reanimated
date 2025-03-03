#import <Foundation/Foundation.h>

namespace reanimated {

static inline bool getIsReducedMotion() {
#if __has_include(<UIKit/UIAccessibility.h>)
  return UIAccessibilityIsReduceMotionEnabled();
#else
  return NSWorkspace.sharedWorkspace.accessibilityDisplayShouldReduceMotion;
#endif // __has_include(<UIKit/UIAccessibility.h>)
}

} // namespace reanimated
