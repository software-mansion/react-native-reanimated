#import <Foundation/Foundation.h>

#if TARGET_OS_OSX
#import <AppKit/AppKit.h>
#else
#import <UIKit/UIAccessibility.h>
#endif // TARGET_OS_OSX

namespace reanimated {

static inline bool getIsReducedMotion() {
#if TARGET_OS_OSX
  return NSWorkspace.sharedWorkspace.accessibilityDisplayShouldReduceMotion;
#else
  return UIAccessibilityIsReduceMotionEnabled();
#endif // TARGET_OS_OSX
}

} // namespace reanimated
