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

  folly::dynamic getStyleValue(
      const ShadowNode::Shared &shadowNode) const override {
    return viewStylesRepository_->getStyleProp(
        shadowNode->getTag(), propertyPath_);
  }

  folly::dynamic getFirstKeyframeValue() const override {
    return convertOptionalToDynamic(keyframes_.front().value);
  }

  folly::dynamic getLastKeyframeValue() const override {
    return convertOptionalToDynamic(keyframes_.back().value);
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

    // TODO - check if this
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

  folly::dynamic update(const ShadowNode::Shared &shadowNode) override {
    const auto afterIndex = getKeyframeAfterIndex(progressProvider);
    const auto beforeIndex = afterIndex - 1;

    const auto &keyframeBefore = keyframes_.at(beforeIndex);
    const auto &keyframeAfter = keyframes_.at(afterIndex);

    std::optional<ValueType> fromValue = keyframeBefore.value;
    std::optional<ValueType> toValue = keyframeAfter.value;

    if (!fromValue.has_value()) {
      fromValue = getFallbackValue(shadowNode);
    }
    if (!toValue.has_value()) {
      toValue = getFallbackValue(shadowNode);
    }

    const auto keyframeProgress = progressProvider_->getKeyframeProgress(
        keyframeBefore.offset, keyframeAfter.offset);

    ValueType result;
    if (keyframeProgress == 1.0) {
      result = toValue.value();
    } else if (keyframeProgress == 0.0) {
      result = fromValue.value();
    } else {
      result = interpolateImpl(
          keyframeProgress,
          fromValue.value(),
          toValue.value(),
          {.node = shadowNode});
    }

    return result.toDynamic();
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

  ValueType getFallbackValue(const ShadowNode::Shared &shadowNode) const {
    const auto styleValue = getStyleValue(shadowNode);
    return styleValue.isNull() ? defaultStyleValue_ : ValueType(styleValue);
  }

  ValueType resolveKeyframeValue(
      const ValueType &unresolvedValue,
      const ShadowNode::Shared &shadowNode) const {
    return interpolateValue(
        0, unresolvedValue, unresolvedValue, {.node = shadowNode});
  }

  size_t getKeyframeAfterIndex(
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
    const auto progress = progressProvider->getGlobalProgress();
    const auto index = std::lower_bound(
        keyframes_.begin(),
        keyframes_.end(),
        progress,
        [](const KeyframeType &keyframe, double progress) {
          return keyframe.offset < progress;
        });

    return std::max(index, 1);
  }

  folly::dynamic convertOptionalToDynamic(
      const std::optional<ValueType> &value) const {
    return value ? value.value().toDynamic() : folly::dynamic();
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
