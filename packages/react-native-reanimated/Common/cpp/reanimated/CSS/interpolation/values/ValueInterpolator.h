#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

namespace reanimated {

using namespace facebook;

template <typename T>
struct Keyframe {
  double offset;
  // If value is optional, the style value should be read from the view style
  std::optional<T> value;
};

template <typename T>
class ValueInterpolator : public Interpolator {
 public:
  ValueInterpolator() = default;

  explicit ValueInterpolator(
      const std::optional<T> &defaultStyleValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::vector<std::string> &propertyPath);

  void initialize(jsi::Runtime &rt, const jsi::Value &keyframeArray);
  jsi::Value update(const InterpolationUpdateContext context) override;
  jsi::Value reset(const InterpolationUpdateContext context) override;

 protected:
  virtual T prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const = 0;

  virtual jsi::Value convertResultToJSI(jsi::Runtime &rt, const T &value)
      const = 0;

  virtual T interpolate(
      double localProgress,
      const T &fromValue,
      const T &toValue,
      const InterpolationUpdateContext context) const = 0;

 private:
  std::shared_ptr<const std::vector<Keyframe<T>>> keyframes_;
  std::shared_ptr<ViewStylesRepository> viewPropsRepository_;

  int keyframeAfterIndex_ = 1;
  Keyframe<T> keyframeBefore_;
  Keyframe<T> keyframeAfter_;
  std::optional<T> defaultStyleValue_; // Default style value
  std::optional<T> previousValue_; // Previous interpolation result

  std::shared_ptr<const std::vector<Keyframe<T>>> createKeyframes(
      jsi::Runtime &rt,
      const jsi::Array &keyframeArray) const;

  std::optional<T> getFallbackValue(
      const InterpolationUpdateContext context) const;

  std::optional<T> resolveKeyframeValue(
      const std::optional<T> unresolvedValue,
      const InterpolationUpdateContext context) const;

  Keyframe<T> getKeyframeAtIndex(
      int index,
      bool shouldResolve,
      const InterpolationUpdateContext context) const;

  void updateCurrentKeyframes(const InterpolationUpdateContext context);

  double calculateLocalProgress(
      const Keyframe<T> &keyframeBefore,
      const Keyframe<T> &keyframeAfter,
      const InterpolationUpdateContext context) const;

  jsi::Value interpolateMissingValue(
      double localProgress,
      const std::optional<T> &fromValue,
      const std::optional<T> &toValue,
      const InterpolationUpdateContext context) const;
};

} // namespace reanimated
