#pragma once

#include <reanimated/CSS/common/values/CSSValueVariant.h>
#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/util/keyframes.h>

#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

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
      const ValueType &defaultStyleValue)
      : PropertyInterpolator(propertyPath),
        defaultStyleValue_(defaultStyleValue) {}
  virtual ~ValueInterpolator() = default;

  folly::dynamic getStyleValue(
      const PropertyInterpolatorUpdateContext &context) const override {
    return context.viewStylesRepository->getStyleProp(
        context.node->getTag(), propertyPath_);
  }

  folly::dynamic getResetStyle(
      const PropertyInterpolatorUpdateContext &context) const override {
    auto styleValue = getStyleValue(context);

    if (styleValue.isNull()) {
      return defaultStyleValue_.toDynamic();
    }

    return styleValue;
  }

  folly::dynamic getFirstKeyframeValue() const override {
    return convertOptionalToDynamic(keyframes_.front().value);
  }

  folly::dynamic getLastKeyframeValue() const override {
    return convertOptionalToDynamic(keyframes_.back().value);
  }

  bool equalsReversingAdjustedStartValue(
      const folly::dynamic &propertyValue) const override {
    if (!reversingAdjustedStartValue_.has_value()) {
      return propertyValue.isNull();
    }
    return reversingAdjustedStartValue_.value() == ValueType(propertyValue);
  }

  void updateKeyframes(const folly::dynamic &keyframes) override {
    const auto parsedKeyframes = parseDynamicKeyframes(keyframes);

    keyframes_.clear();
    keyframes_.reserve(parsedKeyframes.size());

    for (const auto &[offset, value] : parsedKeyframes) {
      if (value.isNull()) {
        keyframes_.push_back(KeyframeType{offset, std::nullopt});
      } else {
        keyframes_.push_back(KeyframeType{offset, ValueType(value)});
      }
    }
  }

  void updateKeyframesFromStyleChange(
      const folly::dynamic &oldStyleValue,
      const folly::dynamic &newStyleValue,
      const folly::dynamic &lastUpdateValue) override {
    KeyframeType firstKeyframe, lastKeyframe;

    if (oldStyleValue.isNull()) {
      reversingAdjustedStartValue_ = std::nullopt;
    } else {
      reversingAdjustedStartValue_ = ValueType(oldStyleValue);
    }

    if (!lastUpdateValue.isNull()) {
      firstKeyframe = {0, ValueType(lastUpdateValue)};
    } else if (!oldStyleValue.isNull()) {
      firstKeyframe = {0, ValueType(oldStyleValue)};
    } else {
      firstKeyframe = {0, defaultStyleValue_};
    }

    if (newStyleValue.isNull()) {
      lastKeyframe = {1, defaultStyleValue_};
    } else {
      lastKeyframe = {1, ValueType(newStyleValue)};
    }

    keyframes_ = {firstKeyframe, lastKeyframe};
  }

  folly::dynamic interpolate(
      const PropertyInterpolatorUpdateContext &context) const override {
    const auto toIndex = getToKeyframeIndex(context.progressProvider);
    const auto fromIndex = toIndex - 1;

    const auto &fromKeyframe = keyframes_[fromIndex];
    const auto &toKeyframe = keyframes_[toIndex];

    std::optional<ValueType> fromValue = fromKeyframe.value;
    std::optional<ValueType> toValue = toKeyframe.value;

    if (!fromValue.has_value()) {
      fromValue = getFallbackValue(context);
    }
    if (!toValue.has_value()) {
      toValue = getFallbackValue(context);
    }

    const auto keyframeProgress = context.progressProvider->getKeyframeProgress(
        fromKeyframe.offset, toKeyframe.offset);

    if (keyframeProgress == 1.0) {
      return toValue.value().toDynamic();
    }
    if (keyframeProgress == 0.0) {
      return fromValue.value().toDynamic();
    }

    return interpolateValue(
               keyframeProgress, fromValue.value(), toValue.value(), context)
        .toDynamic();
  }

 protected:
  ValueType defaultStyleValue_;

  virtual ValueType interpolateValue(
      const double progress,
      const ValueType &fromValue,
      const ValueType &toValue,
      const PropertyInterpolatorUpdateContext &context) const {
    return fromValue.interpolate(progress, toValue);
  }

 private:
  std::vector<ValueKeyframe<AllowedTypes...>> keyframes_;
  std::optional<ValueType> reversingAdjustedStartValue_;

  ValueType getFallbackValue(
      const PropertyInterpolatorUpdateContext &context) const {
    const auto styleValue = getStyleValue(context);
    return styleValue.isNull() ? defaultStyleValue_ : ValueType(styleValue);
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

  folly::dynamic convertOptionalToDynamic(
      const std::optional<ValueType> &value) const {
    return value ? value.value().toDynamic() : folly::dynamic();
  }
};

} // namespace reanimated::css
