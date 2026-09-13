#import <Foundation/Foundation.h>

namespace reanimated {

CGFloat getUIAnimationDragCoefficient(void);
CFTimeInterval calculateTimestampWithSlowAnimations(CFTimeInterval currentTimestamp);
/// Maps Reanimated's simulator-slowed animation clock back to Core Animation's
/// absolute media clock. It is the identity transform on physical devices.
CFTimeInterval calculateMediaTimeFromSlowAnimationsTimestamp(CFTimeInterval animationTimestamp);

} // namespace reanimated
