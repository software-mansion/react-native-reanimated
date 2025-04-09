#import <QuartzCore/QuartzCore.h>

#import <worklets/apple/SlowAnimations.h>

#if TARGET_IPHONE_SIMULATOR
#import <dlfcn.h>
#endif

namespace worklets {

CGFloat getUIAnimationDragCoefficient(void)
{
  static float (*UIAnimationDragCoefficient)(void) = NULL;
#if TARGET_IPHONE_SIMULATOR
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    UIAnimationDragCoefficient = (float (*)(void))dlsym(RTLD_DEFAULT, "UIAnimationDragCoefficient");
  });
#endif
  return UIAnimationDragCoefficient ? UIAnimationDragCoefficient() : 1.f;
}

CFTimeInterval calculateTimestampWithSlowAnimations(CFTimeInterval currentTimestamp)
{
  static const auto MILLISECONDS_IN_SECOND = 1000;
#if TARGET_IPHONE_SIMULATOR
  static CFTimeInterval dragCoefChangedTimestamp = CACurrentMediaTime();
  static CGFloat previousDragCoef = getUIAnimationDragCoefficient();

  const CGFloat dragCoef = getUIAnimationDragCoefficient();
  if (previousDragCoef != dragCoef) {
    previousDragCoef = dragCoef;
    dragCoefChangedTimestamp = CACurrentMediaTime();
  }

  const bool areSlowAnimationsEnabled = dragCoef != 1.f;
  if (areSlowAnimationsEnabled) {
    currentTimestamp = (dragCoefChangedTimestamp + (currentTimestamp - dragCoefChangedTimestamp) / dragCoef);
  }
#endif // TARGET_IPHONE_SIMULATOR
  currentTimestamp *= MILLISECONDS_IN_SECOND;
  return currentTimestamp;
}

} // namespace worklets
