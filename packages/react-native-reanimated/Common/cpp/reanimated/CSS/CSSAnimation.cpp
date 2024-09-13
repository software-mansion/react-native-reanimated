#include <reanimated/CSS/CSSAnimation.h>

namespace reanimated {

CSSAnimation::CSSAnimation(
    jsi::Runtime &rt,
    ShadowNode::Shared shadowNode,
    const CSSAnimationConfig &config)
    : shadowNode(shadowNode),
      delay(config.animationDelay),
      duration(config.animationDuration),
      iterationCount(config.animationIterationCount),
      easingFunction(getEasingFunction(config.animationTimingFunction)),
      direction(getAnimationDirection(config.animationDirection)),
      fillMode(getAnimationFillMode(config.animationFillMode)),
      styleInterpolator(KeyframedStyleInterpolator(rt, config.keyframedStyle)) {
}

void CSSAnimation::start(time_t timestamp) {
  if (iterationCount == 0) {
    state = CSSAnimationState::finished;
    return;
  }
  state = CSSAnimationState::running;
  startTime = timestamp;
  previousProgress.reset();
  previousToPreviousProgress.reset();
}

void CSSAnimation::finish() {
  state = CSSAnimationState::finished;
}

jsi::Value CSSAnimation::update(jsi::Runtime &rt, time_t timestamp) {
  currentIterationElapsedTime =
      timestamp - (startTime + delay + previousIterationsDuration);

  // Check if the animation has not started yet because of the delay
  if (currentIterationElapsedTime < 0) {
    // We have to return the style from the first animation keyframe (apply
    // backwards fill mode) in every keyframe before the animation starts
    // if the fill mode is backwards or both
    return maybeApplyBackwardsFillMode(rt);
  }

  double progress = applyAnimationDirection(updateIterationProgress(timestamp));

  // Check if the animation has finished (duration can be a floating point
  // number so we can't just check if the progress is 1.0)
  bool shouldFinish = iterationCount != -1 &&
      (timestamp - (delay + startTime)) >= duration * iterationCount;
  bool directionChanged = false;

  if (shouldFinish) {
    // Override current progress for the last update in the last iteration
    double intPart = std::floor(iterationCount);
    progress = applyAnimationDirection(
        intPart == iterationCount ? 1 : iterationCount - intPart);
  }
  // Determine if the progress update direction has changed (e.g. because of
  // the easing used or the alternating animation direction)
  else if (
      previousProgress.has_value() && previousToPreviousProgress.has_value()) {
    auto prevDiff =
        previousProgress.value() - previousToPreviousProgress.value();
    auto currentDiff = progress - previousProgress.value();
    directionChanged = prevDiff * currentDiff < 0;
  }

  auto updatedStyle = styleInterpolator.update(
      createUpdateContext(rt, easingFunction(progress), directionChanged));

  previousToPreviousProgress = previousProgress;
  previousProgress = progress;

  if (state == CSSAnimationState::finishing) {
    finish();
    return maybeApplyForwardsFillMode(rt);
  } else if (shouldFinish) {
    state = CSSAnimationState::finishing;
  }

  return updatedStyle;
}

CSSAnimationDirection CSSAnimation::getAnimationDirection(
    const std::string &str) {
  static const std::unordered_map<std::string, CSSAnimationDirection>
      strToEnumMap = {
          {"normal", normal},
          {"reverse", reverse},
          {"alternate", alternate},
          {"alternate-reverse", alternateReverse}};

  auto it = strToEnumMap.find(str);
  if (it != strToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Invalid string for CSSAnimationDirection enum: " + str);
  }
}

CSSAnimationFillMode CSSAnimation::getAnimationFillMode(
    const std::string &str) {
  static const std::unordered_map<std::string, CSSAnimationFillMode>
      strToEnumMap = {
          {"none", none},
          {"forwards", forwards},
          {"backwards", backwards},
          {"both", both}};

  auto it = strToEnumMap.find(str);
  if (it != strToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Invalid string for CSSAnimationFillMode enum: " + str);
  }
}

double CSSAnimation::applyAnimationDirection(double progress) const {
  switch (direction) {
    case normal:
      return progress;
    case reverse:
      return 1.0 - progress;
    case alternate:
      return currentIteration % 2 == 0 ? 1.0 - progress : progress;
    case alternateReverse:
      return currentIteration % 2 == 0 ? progress : 1.0 - progress;
  }
}

double CSSAnimation::updateIterationProgress(time_t timestamp) {
  if (duration == 0) {
    return 1;
  }

  // We can increase curentIteration by more than just one iteration if the
  // animation delay is negative, thus we are using this division to get the
  // number of iterations that have passed since the previous animation update
  // (deltaIterations can be greater than for the first update of the animation
  // with the negative delay)
  const double progress = currentIterationElapsedTime / duration;
  const unsigned deltaIterations = static_cast<unsigned>(progress);

  if (deltaIterations > 0) {
    // Return 1 if the current iteration is the last one
    if (currentIteration == iterationCount) {
      return 1;
    }

    currentIteration += deltaIterations;
    previousIterationsDuration = (currentIteration - 1) * duration;

    if (direction == normal || direction == reverse) {
      previousProgress.reset();
      previousToPreviousProgress.reset();
    }
  }

  // If the current iteration changes, the progress must be updated respectively
  // not to contain the progress of the previous iteration
  return progress - deltaIterations;
}

InterpolationUpdateContext CSSAnimation::createUpdateContext(
    jsi::Runtime &rt,
    double progress,
    bool directionChanged) const {
  return {rt, shadowNode, progress, previousProgress, directionChanged};
}

jsi::Value CSSAnimation::maybeApplyBackwardsFillMode(jsi::Runtime &rt) {
  if (fillMode == backwards || fillMode == both) {
    // Return the style from the first animation keyframe
    return styleInterpolator.update(createUpdateContext(rt, 0, false));
  }

  return jsi::Value::undefined();
}

jsi::Value CSSAnimation::maybeApplyForwardsFillMode(jsi::Runtime &rt) {
  if (fillMode == forwards || fillMode == both) {
    // Don't restore the style from the view style if the forwards fill mode is
    // applied
    return jsi::Value::undefined();
  }

  // Reset all styles applied during the animation and restore the
  // view style
  return styleInterpolator.reset(createUpdateContext(rt, 0, false));
}

} // namespace reanimated
