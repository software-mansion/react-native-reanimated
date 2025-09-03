#pragma once

#include <reanimated/CSS/common/values/CSSValueVariant.h>
#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/utils/keyframes.h>

#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace reanimated::css {

template <typename TValue>
struct is_css_value : std::is_base_of<CSSValue, TValue> {};

struct ValueKeyframe {
  double offset;
  std::optional<CSSValue> value;
};

class ValueInterpolatorBase : public PropertyInterpolator {
 public:
  explicit ValueInterpolatorBase(
      const PropertyPath &propertyPath,
      const CSSValue &defaultValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~ValueInterpolatorBase() = default;

  folly::dynamic getStyleValue(
      const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getResetStyle(
      const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getFirstKeyframeValue() const override;
  folly::dynamic getLastKeyframeValue() const override;
  bool equalsReversingAdjustedStartValue(
      const folly::dynamic &propertyValue) const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      const folly::dynamic &oldStyleValue,
      const folly::dynamic &newStyleValue,
      const folly::dynamic &lastUpdateValue) override;

  folly::dynamic interpolate(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider)
      const override;

 protected:
  CSSValue defaultStyleValue_;
  std::vector<ValueKeyframe> keyframes_;
  folly::dynamic reversingAdjustedStartValue_;

  virtual CSSValue createValue(jsi::Runtime &rt, const jsi::Value &value)
      const = 0;
  virtual CSSValue createValue(const folly::dynamic &value) const = 0;
  virtual CSSValue interpolateValue(
      double progress,
      const CSSValue &fromValue,
      const CSSValue &toValue,
      const CSSValueInterpolationContext &context) const = 0;

 private:
  folly::dynamic convertOptionalToDynamic(
      const std::optional<CSSValue> &value) const;
  CSSValue getFallbackValue(
      const std::shared_ptr<const ShadowNode> &shadowNode) const;
  size_t getToKeyframeIndex(
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const;
}

template <typename... AllowedTypes>
class ValueInterpolator : public ValueInterpolatorBase {
  static_assert(
      (... && is_css_value<AllowedTypes>::value),
      "[Reanimated] ValueInterpolator: All interpolated types must inherit from CSSValue");

 public:
  using ValueType = CSSValueVariant<AllowedTypes...>;

  using ValueInterpolatorBase::ValueInterpolatorBase;

 protected:
  CSSValue createValue(jsi::Runtime &rt, const jsi::Value &value)
      const override {
    return ValueType(rt, value);
  }
  CSSValue createValue(const folly::dynamic &value) const override {
    return ValueType(value);
  }

  CSSValue interpolateValue(
      double progress,
      const CSSValue &fromValue,
      const CSSValue &toValue,
      const CSSValueInterpolationContext &context) const override {
    const auto &from = std::static_pointer_cast<ValueType>(fromValue);
    const auto &to = std::static_pointer_cast<ValueType>(toValue);
    return from.interpolate(progress, to);
  }
};

} // namespace reanimated::css
