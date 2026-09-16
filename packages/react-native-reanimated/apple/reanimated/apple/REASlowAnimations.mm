#import <reanimated/apple/REASlowAnimations.h>

#if TARGET_IPHONE_SIMULATOR

#import <QuartzCore/QuartzCore.h>
#import <dlfcn.h>

namespace reanimated {

CGFloat getUIAnimationDragCoefficient(void)
{
  static float (*UIAnimationDragCoefficient)(void) = NULL;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    UIAnimationDragCoefficient = reinterpret_cast<float (*)(void)>(dlsym(RTLD_DEFAULT, "UIAnimationDragCoefficient"));
  });
  return UIAnimationDragCoefficient ? UIAnimationDragCoefficient() : 1.f;
}

CFTimeInterval calculateTimestampWithSlowAnimations(CFTimeInterval currentTimestamp)
{
  static CFTimeInterval dragCoefChangedTimestamp = CACurrentMediaTime();
  static CGFloat previousDragCoef = getUIAnimationDragCoefficient();

  const CGFloat dragCoef = getUIAnimationDragCoefficient();
  if (previousDragCoef != dragCoef) {
    previousDragCoef = dragCoef;
    dragCoefChangedTimestamp = CACurrentMediaTime();
  }

  const bool areSlowAnimationsEnabled = dragCoef != 1.f;
  if (areSlowAnimationsEnabled) {
    return (dragCoefChangedTimestamp + (currentTimestamp - dragCoefChangedTimestamp) / dragCoef);
  } else {
    return currentTimestamp;
  }
}

CFTimeInterval calculateMediaTimeFromSlowAnimationsTimestamp(CFTimeInterval animationTimestamp)
{
  const CFTimeInterval mediaTime = CACurrentMediaTime();
  const CFTimeInterval animationTime = calculateTimestampWithSlowAnimations(mediaTime);
  return mediaTime + (animationTimestamp - animationTime) * getUIAnimationDragCoefficient();
}

CFTimeInterval calculateMediaDurationFromSlowAnimationsDuration(CFTimeInterval animationDuration)
{
  return animationDuration * getUIAnimationDragCoefficient();
}

} // namespace reanimated

#endif // TARGET_IPHONE_SIMULATOR
