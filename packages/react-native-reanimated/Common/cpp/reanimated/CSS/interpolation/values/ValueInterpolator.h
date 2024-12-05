#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/Color.h>
#include <reanimated/CSS/common/TransformOrigin.h>
#include <reanimated/CSS/common/UnitValue.h>
#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/util/keyframes.h>

#include <memory>
#include <string>
#include <vector>

namespace reanimated {

template <typename T>
struct ValueKeyframe {
  double offset;
  // If value is optional, the style value should be read from the view style
  std::optional<T> value;
};

struct ValueInterpolatorUpdateContext {
  const ShadowNode::Shared &node;
};

template <typename T>
class ValueInterpolator : public PropertyInterpolator {
 public:
  explicit ValueInterpolator(
      const PropertyPath &propertyPath,
      const std::optional<T> &defaultStyleValue,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~ValueInterpolator() = default;

  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getCurrentValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override;
  jsi::Value getFirstKeyframeValue(jsi::Runtime &rt) const override;
  jsi::Value getLastKeyframeValue(jsi::Runtime &rt) const override;

  bool equalsReversingAdjustedStartValue(
      jsi::Runtime &rt,
      const jsi::Value &propertyValue) const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) override;

  jsi::Value update(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override;
  jsi::Value reset(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override;

 protected:
  std::optional<T> defaultStyleValue_; // Default style value

  virtual T prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const = 0;
  virtual jsi::Value convertResultToJSI(jsi::Runtime &rt, const T &value)
      const = 0;

  virtual T interpolate(
      double progress,
      const T &fromValue,
      const T &toValue,
      const ValueInterpolatorUpdateContext &context) const = 0;

  virtual bool isResolvable() const {
    return false;
  }

 private:
  std::vector<ValueKeyframe<T>> keyframes_;

  int keyframeAfterIndex_ = 1;
  ValueKeyframe<T> keyframeBefore_;
  ValueKeyframe<T> keyframeAfter_;
  std::optional<T> previousValue_; // Previous interpolation result
  std::optional<T> reversingAdjustedStartValue_; // For transition interrupting

  std::optional<T> getFallbackValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const;
  std::optional<T> resolveKeyframeValue(
      const std::optional<T> &unresolvedValue,
      const ShadowNode::Shared &shadowNode) const;

  ValueKeyframe<T> getKeyframeAtIndex(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      size_t index,
      bool shouldResolve) const;
  void updateCurrentKeyframes(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode);

  jsi::Value interpolateMissingValue(
      jsi::Runtime &rt,
      double progress,
      const std::optional<T> &fromValue,
      const std::optional<T> &toValue) const;
  jsi::Value convertOptionalToJSI(
      jsi::Runtime &rt,
      const std::optional<T> &value) const;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
