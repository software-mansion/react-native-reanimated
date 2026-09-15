#import <Foundation/Foundation.h>

namespace reanimated {

CGFloat getUIAnimationDragCoefficient(void);
CFTimeInterval calculateTimestampWithSlowAnimations(CFTimeInterval currentTimestamp);
/// Inverse of calculateTimestampWithSlowAnimations: a slowed-clock timestamp as Core Animation media time.
CFTimeInterval calculateMediaTimeFromSlowAnimationsTimestamp(CFTimeInterval animationTimestamp);
/// Stretches a slowed-clock duration for Core Animation, which the Simulator does not slow down.
CFTimeInterval calculateMediaDurationFromSlowAnimationsDuration(CFTimeInterval animationDuration);

} // namespace reanimated
