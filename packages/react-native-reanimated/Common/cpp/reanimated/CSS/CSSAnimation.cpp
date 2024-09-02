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

  LOG(INFO) << "currentIterationElapsedTime: " << currentIterationElapsedTime;

  // Check if the animation has not started yet because of the delay
  if (currentIterationElapsedTime < 0) {
    return jsi::Value::undefined();
  }

  maybeUpdateIterationNumber(timestamp);
  const double progress = getCurrentIterationProgress(timestamp);

  // Check if the animation has finished (duration can be a floating point
  // number so we can't just check if the progress is 1.0)
  if (iterationCount != -1 &&
      (timestamp - (delay + startTime)) >= duration * iterationCount) {
    finish();
  }

  // Determine if the progress update direction has changed (e.g. because of the
  // easing used or the alternating animation direction)
  bool directionChanged = false;
  if (previousProgress.has_value() && previousToPreviousProgress.has_value()) {
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

double CSSAnimation::getCurrentIterationProgress(time_t timestamp) const {
  if (duration == 0) {
    return 1.0;
  }

  const double progress = currentIterationElapsedTime / duration;

  if (progress > 1.0) {
    return 1.0;
  }

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

void CSSAnimation::maybeUpdateIterationNumber(time_t timestamp) {
  // We can increase curentIteration by more than just one iteration if the
  // animation delay is negative, thus we are using this division to get the
  // number of iterations that have passed since the previous animation update
  // (deltaIterations can be greater than for the first update of the animation
  // with the negative delay)
  const auto deltaIterations =
      static_cast<size_t>(currentIterationElapsedTime / duration);

  if (deltaIterations > 0) {
    currentIteration += deltaIterations;
    previousIterationsDuration = (currentIteration - 1) * duration;

    if (direction == normal || direction == reverse) {
      previousProgress.reset();
      previousToPreviousProgress.reset();
    }
  }
}

} // namespace reanimated
