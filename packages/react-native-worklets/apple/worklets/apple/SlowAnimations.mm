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
    UIAnimationDragCoefficient = reinterpret_cast<float (*)(void)>(dlsym(RTLD_DEFAULT, "UIAnimationDragCoefficient"));
  });
#endif
  return UIAnimationDragCoefficient ? UIAnimationDragCoefficient() : 1.f;
}

CFTimeInterval calculateTimestampWithSlowAnimations(CFTimeInterval currentTimestamp)
{
#if TARGET_IPHONE_SIMULATOR
  // The virtual clock is rebased on every drag coefficient change so it stays
  // continuous and ongoing animations don't jump when toggling Slow Animations.
  static CFTimeInterval realBaseTimestamp = CACurrentMediaTime();
  static CFTimeInterval virtualBaseTimestamp = realBaseTimestamp;
  static CGFloat dragCoef = getUIAnimationDragCoefficient();

  const CGFloat newDragCoef = getUIAnimationDragCoefficient();
  if (newDragCoef != dragCoef) {
    virtualBaseTimestamp += (currentTimestamp - realBaseTimestamp) / dragCoef;
    realBaseTimestamp = currentTimestamp;
    dragCoef = newDragCoef;
  }

  currentTimestamp = virtualBaseTimestamp + (currentTimestamp - realBaseTimestamp) / dragCoef;
#endif // TARGET_IPHONE_SIMULATOR
  return currentTimestamp;
}

} // namespace worklets
