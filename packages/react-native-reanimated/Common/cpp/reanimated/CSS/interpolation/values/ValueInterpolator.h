#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSValueVariant.h>
#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/util/keyframes.h>

#include <memory>
#include <string>
#include <vector>

namespace reanimated {

struct ValueInterpolatorUpdateContext {
  const ShadowNode::Shared &node;
};

template <typename TValue>
struct is_css_value : std::is_base_of<CSSValue, TValue> {};

template <typename... AllowedTypes>
struct ValueKeyframe {
  double offset;
  std::optional<CSSValueVariant<AllowedTypes...>> value;
};

template <typename... AllowedTypes>
class ValueInterpolator : public PropertyInterpolator {
  static_assert(
      (... && is_css_value<AllowedTypes>::value),
      "[Reanimated] ValueInterpolator: All interpolated types must inherit from CSSValue");

 public:
  using ValueType = CSSValueVariant<AllowedTypes...>;
  using KeyframeType = ValueKeyframe<AllowedTypes...>;

  explicit ValueInterpolator(
      const PropertyPath &propertyPath,
      const ValueType &defaultStyleValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      : PropertyInterpolator(propertyPath, viewStylesRepository),
        defaultStyleValue_(defaultStyleValue) {}
  virtual ~ValueInterpolator() = default;

  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override {
    return viewStylesRepository_->getStyleProp(
        rt, shadowNode->getTag(), propertyPath_);
  }

  jsi::Value getResetStyle(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override {
    auto styleValue = getStyleValue(rt, shadowNode);

    if (styleValue.isUndefined()) {
      return defaultStyleValue_.toJSIValue(rt);
    }

    return styleValue;
  }

  jsi::Value getFirstKeyframeValue(jsi::Runtime &rt) const override {
    return convertOptionalToJSI(rt, keyframes_.front().value);
  }

  jsi::Value getLastKeyframeValue(jsi::Runtime &rt) const override {
    return convertOptionalToJSI(rt, keyframes_.back().value);
  }

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override {
    const auto parsedKeyframes = parseJSIKeyframes(rt, keyframes);

    keyframes_.clear();
    keyframes_.reserve(parsedKeyframes.size());

    for (const auto &[offset, value] : parsedKeyframes) {
      if (value.isUndefined()) {
        keyframes_.emplace_back(offset, std::nullopt);
      } else {
        keyframes_.emplace_back(offset, ValueType(rt, value));
      }
    }
  }

  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue,
      const jsi::Value &previousValue,
      const jsi::Value &reversingAdjustedStartValue) override {
    KeyframeType firstKeyframe, lastKeyframe;

    // TODO - check if this is correct
    if (!previousValue.isUndefined()) {
      firstKeyframe = {0, ValueType(rt, previousValue)};
    } else {
      firstKeyframe = {0, ValueType(rt, reversingAdjustedStartValue)};
    }

    if (!newStyleValue.isUndefined()) {
      lastKeyframe = {1, ValueType(rt, newStyleValue)};
    } else {
      lastKeyframe = {1, defaultStyleValue_};
    }

    keyframes_ = {firstKeyframe, lastKeyframe};
  }

  jsi::Value interpolate(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider)
      const override {
    const auto toIndex = getToKeyframeIndex(progressProvider);
    const auto fromIndex = toIndex - 1;

    const auto &fromKeyframe = keyframes_.at(fromIndex);
    const auto &toKeyframe = keyframes_.at(toIndex);

    std::optional<ValueType> fromValue = fromKeyframe.value;
    std::optional<ValueType> toValue = toKeyframe.value;

    if (!fromValue.has_value()) {
      fromValue = getFallbackValue(rt, shadowNode);
    }
    if (!toValue.has_value()) {
      toValue = getFallbackValue(rt, shadowNode);
    }

    const auto keyframeProgress = progressProvider->getKeyframeProgress(
        fromKeyframe.offset, toKeyframe.offset);

    ValueType result;
    if (keyframeProgress == 1.0) {
      result = toValue.value();
    } else if (keyframeProgress == 0.0) {
      result = fromValue.value();
    } else {
      result = interpolateValue(
          keyframeProgress,
          fromValue.value(),
          toValue.value(),
          {.node = shadowNode});
    }

    return result.toJSIValue(rt);
  }

 protected:
  ValueType defaultStyleValue_;

  virtual ValueType interpolateValue(
      double progress,
      const ValueType &fromValue,
      const ValueType &toValue,
      const ValueInterpolatorUpdateContext &context) const {
    return fromValue.interpolate(progress, toValue);
  }

 private:
  std::vector<ValueKeyframe<AllowedTypes...>> keyframes_;

  ValueType getFallbackValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const {
    const jsi::Value &styleValue = getStyleValue(rt, shadowNode);
    return styleValue.isUndefined() ? defaultStyleValue_
                                    : ValueType(rt, styleValue);
  }

  ValueType resolveKeyframeValue(
      const ValueType &unresolvedValue,
      const ShadowNode::Shared &shadowNode) const {
    return interpolateValue(
        0, unresolvedValue, unresolvedValue, {.node = shadowNode});
  }

  size_t getToKeyframeIndex(
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
    const auto progress = progressProvider->getGlobalProgress();

    const auto it = std::upper_bound(
        keyframes_.begin(),
        keyframes_.end(),
        progress,
        [](double progress, const KeyframeType &keyframe) {
          return progress < keyframe.offset;
        });

    // If we're at the end, return the last valid keyframe index
    if (it == keyframes_.end()) {
      return keyframes_.size() - 1;
    }

    return std::distance(keyframes_.begin(), it);
  }

  jsi::Value convertOptionalToJSI(
      jsi::Runtime &rt,
      const std::optional<ValueType> &value) const {
    return value ? value.value().toJSIValue(rt) : jsi::Value::undefined();
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
