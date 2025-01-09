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

template <typename T>
struct is_css_value : std::is_base_of<CSSValue, T> {};

template <typename... AllowedTypes>
struct ValueKeyframe {
  double offset;
  std::optional<CSSValueVariant<AllowedTypes...>> value;
};

template <typename... AllowedTypes>
class ValueInterpolator : public PropertyInterpolator {
  static_assert(
      (... && is_css_value<AllowedTypes>::value),
      "[Reanimated] ValueInterpolator: All types must inherit from CSSValue");

 public:
  using ValueType = CSSValueVariant<AllowedTypes...>;

  explicit ValueInterpolator(
      const PropertyPath &propertyPath,
      const ValueType &defaultStyleValue,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      : PropertyInterpolator(
            propertyPath,
            progressProvider,
            viewStylesRepository),
        defaultStyleValue_(defaultStyleValue) {}
  virtual ~ValueInterpolator() = default;

  jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override {
    return viewStylesRepository_->getStyleProp(
        rt, shadowNode->getTag(), propertyPath_);
  }

  jsi::Value getCurrentValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const override {
    if (previousValue_.has_value()) {
      return previousValue_.value().toJSIValue(rt);
    }
    auto styleValue = getStyleValue(rt, shadowNode);
    if (!styleValue.isUndefined()) {
      return styleValue;
    }
    return defaultStyleValue_.toJSIValue(rt);
  }

  jsi::Value getFirstKeyframeValue(jsi::Runtime &rt) const override {
    return convertOptionalToJSI(rt, keyframes_.front().value);
  }

  jsi::Value getLastKeyframeValue(jsi::Runtime &rt) const override {
    return convertOptionalToJSI(rt, keyframes_.back().value);
  }

  bool equalsReversingAdjustedStartValue(
      jsi::Runtime &rt,
      const jsi::Value &propertyValue) const override {
    if (!reversingAdjustedStartValue_.has_value()) {
      return propertyValue.isUndefined();
    }
    return reversingAdjustedStartValue_.value() == ValueType(rt, propertyValue);
  }

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override {
    keyframeAfterIndex_ = 1;
    const auto parsedKeyframes = parseJSIKeyframes(rt, keyframes);

    keyframes_.clear();
    keyframes_.reserve(parsedKeyframes.size());

    for (const auto &[offset, value] : parsedKeyframes) {
      if (value.isUndefined()) {
        keyframes_.push_back(
            ValueKeyframe<AllowedTypes...>{offset, std::nullopt});
      } else {
        keyframes_.push_back(
            ValueKeyframe<AllowedTypes...>{offset, ValueType(rt, value)});
      }
    }
  }

  void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) override {
    keyframeAfterIndex_ = 1;
    ValueKeyframe<AllowedTypes...> firstKeyframe, lastKeyframe;

    if (!oldStyleValue.isUndefined()) {
      reversingAdjustedStartValue_ = ValueType(rt, oldStyleValue);
    } else {
      reversingAdjustedStartValue_ = defaultStyleValue_;
    }

    if (previousValue_.has_value()) {
      firstKeyframe = {0, previousValue_};
    } else {
      firstKeyframe = {0, reversingAdjustedStartValue_};
    }

    if (!newStyleValue.isUndefined()) {
      lastKeyframe = {1, ValueType(rt, newStyleValue)};
    } else {
      lastKeyframe = {1, defaultStyleValue_};
    }

    keyframes_ = {firstKeyframe, lastKeyframe};
  }

  jsi::Value update(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override {
    updateCurrentKeyframes(rt, shadowNode);

    std::optional<ValueType> fromValue = keyframeBefore_.value;
    std::optional<ValueType> toValue = keyframeAfter_.value;

    if (!fromValue.has_value()) {
      fromValue = getFallbackValue(rt, shadowNode);
    }
    if (!toValue.has_value()) {
      toValue = getFallbackValue(rt, shadowNode);
    }

    const auto keyframeProgress = progressProvider_->getKeyframeProgress(
        keyframeBefore_.offset, keyframeAfter_.offset);

    if (keyframeProgress == 1.0) {
      previousValue_ = toValue.value();
    } else if (keyframeProgress == 0.0) {
      previousValue_ = fromValue.value();
    } else {
      previousValue_ = interpolate(
          keyframeProgress,
          fromValue.value(),
          toValue.value(),
          {.node = shadowNode});
    }

    return previousValue_.value().toJSIValue(rt);
  }

  jsi::Value reset(jsi::Runtime &rt, const ShadowNode::Shared &shadowNode)
      override {
    previousValue_ = std::nullopt;
    reversingAdjustedStartValue_ = std::nullopt;
    return getCurrentValue(rt, shadowNode);
  }

 protected:
  ValueType defaultStyleValue_;

  virtual ValueType interpolate(
      double progress,
      const ValueType &fromValue,
      const ValueType &toValue,
      const ValueInterpolatorUpdateContext &context) const {
    return fromValue.interpolate(progress, toValue);
  }

 private:
  std::vector<ValueKeyframe<AllowedTypes...>> keyframes_;
  int keyframeAfterIndex_ = 1;
  ValueKeyframe<AllowedTypes...> keyframeBefore_;
  ValueKeyframe<AllowedTypes...> keyframeAfter_;
  std::optional<ValueType> previousValue_;
  std::optional<ValueType> reversingAdjustedStartValue_;

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
    return interpolate(
        0, unresolvedValue, unresolvedValue, {.node = shadowNode});
  }

  ValueKeyframe<AllowedTypes...> getKeyframeAtIndex(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      size_t index,
      bool shouldResolve) const {
    const auto &keyframe = keyframes_.at(index);

    if (shouldResolve) {
      const double offset = keyframe.offset;
      std::optional<ValueType> unresolvedValue;

      if (keyframe.value.has_value()) {
        unresolvedValue = keyframe.value.value();
      } else {
        unresolvedValue = getFallbackValue(rt, shadowNode);
      }

      return ValueKeyframe<AllowedTypes...>{
          offset, resolveKeyframeValue(unresolvedValue.value(), shadowNode)};
    }

    return keyframe;
  }

  void updateCurrentKeyframes(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) {
    const auto progress = progressProvider_->getGlobalProgress();
    const bool isProgressLessThanHalf = progress < 0.5;
    const auto prevAfterIndex = keyframeAfterIndex_;

    if (progressProvider_->isFirstUpdate()) {
      keyframeAfterIndex_ = isProgressLessThanHalf ? 1 : keyframes_.size() - 1;
    }

    while (keyframeAfterIndex_ < keyframes_.size() - 1 &&
           keyframes_[keyframeAfterIndex_].offset < progress)
      ++keyframeAfterIndex_;

    while (keyframeAfterIndex_ > 1 &&
           keyframes_[keyframeAfterIndex_ - 1].offset >= progress)
      --keyframeAfterIndex_;

    if (progressProvider_->isFirstUpdate()) {
      keyframeBefore_ = getKeyframeAtIndex(
          rt,
          shadowNode,
          keyframeAfterIndex_ - 1,
          Resolvable<ValueType> && isProgressLessThanHalf);
      keyframeAfter_ = getKeyframeAtIndex(
          rt,
          shadowNode,
          keyframeAfterIndex_,
          Resolvable<ValueType> && !isProgressLessThanHalf);
    } else if (keyframeAfterIndex_ != prevAfterIndex) {
      keyframeBefore_ = getKeyframeAtIndex(
          rt,
          shadowNode,
          keyframeAfterIndex_ - 1,
          Resolvable<ValueType> && keyframeAfterIndex_ > prevAfterIndex);
      keyframeAfter_ = getKeyframeAtIndex(
          rt,
          shadowNode,
          keyframeAfterIndex_,
          Resolvable<ValueType> && keyframeAfterIndex_ < prevAfterIndex);
    }
  }

  jsi::Value convertOptionalToJSI(
      jsi::Runtime &rt,
      const std::optional<ValueType> &value) const {
    return value ? value.value().toJSIValue(rt) : jsi::Value::undefined();
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
