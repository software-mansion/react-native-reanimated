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

jsi::Value CSSAnimation::update(jsi::Runtime &rt, time_t timestamp) {
  currentIterationElapsedTime =
      timestamp - (startTime + delay + previousIterationsDuration);

  // Check if the animation has not started yet because of the delay
  if (currentIterationElapsedTime < 0) {
    return jsi::Value::undefined();
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

  auto updatedStyle = styleInterpolator.update({
      .rt = rt,
      .progress = easingFunction(progress),
      .previousProgress = previousProgress,
      .directionChanged = directionChanged,
      .node = shadowNode,
  });

  previousToPreviousProgress = previousProgress;
  previousProgress = progress;

  if (shouldFinish) {
    finish();
  }

  return updatedStyle;
}

void CSSAnimation::finish() {
  state = CSSAnimationState::finished;
  // TODO: restore original styles if animation-fill-mode is not set
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
        "Invalid string for CSSAnimationDirection enum: " + str);
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

} // namespace reanimated
