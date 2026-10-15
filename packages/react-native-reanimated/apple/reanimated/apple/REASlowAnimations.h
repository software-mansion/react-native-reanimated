#import <Foundation/Foundation.h>

namespace reanimated {

// Only the Simulator slows animations, so a device build inlines every conversion away.
#if TARGET_IPHONE_SIMULATOR
CGFloat getUIAnimationDragCoefficient(void);
CFTimeInterval calculateTimestampWithSlowAnimations(CFTimeInterval currentTimestamp);
/// Inverse of calculateTimestampWithSlowAnimations: a slowed-clock timestamp as Core Animation media time.
CFTimeInterval calculateMediaTimeFromSlowAnimationsTimestamp(CFTimeInterval animationTimestamp);
/// Stretches a slowed-clock duration for Core Animation, which the Simulator does not slow down.
CFTimeInterval calculateMediaDurationFromSlowAnimationsDuration(CFTimeInterval animationDuration);
#else
inline CFTimeInterval calculateTimestampWithSlowAnimations(CFTimeInterval currentTimestamp) {
  return currentTimestamp;
}

inline CFTimeInterval calculateMediaTimeFromSlowAnimationsTimestamp(CFTimeInterval animationTimestamp) {
  return animationTimestamp;
}

inline CFTimeInterval calculateMediaDurationFromSlowAnimationsDuration(CFTimeInterval animationDuration) {
  return animationDuration;
}
#endif

} // namespace reanimated
