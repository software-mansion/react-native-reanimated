#pragma once

#include <reanimated/CSS/common/Color.h>
#include <reanimated/CSS/common/TransformOrigin.h>
#include <reanimated/CSS/common/UnitValue.h>
#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/util/keyframes.h>

namespace reanimated {

template <typename T>
struct ValueKeyframe {
  double offset;
  // If value is optional, the style value should be read from the view style
  std::optional<T> value;
};

template <typename T>
class ValueInterpolator : public PropertyInterpolator {
 public:
  explicit ValueInterpolator(
      const std::optional<T> &defaultStyleValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);
  virtual ~ValueInterpolator() = default;

  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getCurrentValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;

  virtual void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes)
      override;
  virtual void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) override;

  jsi::Value update(const PropertyInterpolationUpdateContext &context) override;
  jsi::Value reset(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override;

 protected:
  std::optional<T> defaultStyleValue_; // Default style value
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  virtual T prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const = 0;

  virtual jsi::Value convertResultToJSI(jsi::Runtime &rt, const T &value)
      const = 0;

  virtual T interpolate(
      double localProgress,
      const T &fromValue,
      const T &toValue,
      const PropertyInterpolationUpdateContext &context) const = 0;

 private:
  std::vector<ValueKeyframe<T>> keyframes_;

  int keyframeAfterIndex_ = 1;
  ValueKeyframe<T> keyframeBefore_;
  ValueKeyframe<T> keyframeAfter_;
  std::optional<T> previousValue_; // Previous interpolation result

  std::optional<T> getFallbackValue(
      const PropertyInterpolationUpdateContext &context) const;

  std::optional<T> resolveKeyframeValue(
      const std::optional<T> &unresolvedValue,
      const PropertyInterpolationUpdateContext &context) const;

  ValueKeyframe<T> getKeyframeAtIndex(
      size_t index,
      bool shouldResolve,
      const PropertyInterpolationUpdateContext &context) const;

  void updateCurrentKeyframes(
      const PropertyInterpolationUpdateContext &context);

  double calculateLocalProgress(
      const ValueKeyframe<T> &keyframeBefore,
      const ValueKeyframe<T> &keyframeAfter,
      const PropertyInterpolationUpdateContext &context) const;

  jsi::Value interpolateMissingValue(
      double localProgress,
      const std::optional<T> &fromValue,
      const std::optional<T> &toValue,
      const PropertyInterpolationUpdateContext &context) const;
};

} // namespace reanimated
