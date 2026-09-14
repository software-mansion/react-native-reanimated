#import <Foundation/Foundation.h>

namespace reanimated {

CGFloat getUIAnimationDragCoefficient(void);
CFTimeInterval calculateTimestampWithSlowAnimations(CFTimeInterval currentTimestamp);
/// Converts a slowed animation timestamp to Core Animation media time.
CFTimeInterval calculateMediaTimeFromSlowAnimationsTimestamp(CFTimeInterval animationTimestamp);

} // namespace reanimated
