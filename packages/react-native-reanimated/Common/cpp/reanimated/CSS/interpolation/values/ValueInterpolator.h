#pragma once

#include <reanimated/CSS/common/values/CSSValueVariant.h>
#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/utils/keyframes.h>

#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace reanimated::css {

struct ValueKeyframe {
  double offset;
  std::optional<std::shared_ptr<CSSValue>> value;
};

class ValueInterpolatorBase : public PropertyInterpolator {
 public:
  explicit ValueInterpolatorBase(
      const PropertyPath &propertyPath,
      const std::shared_ptr<CSSValue> &defaultValue,
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
  std::vector<ValueKeyframe> keyframes_;
  std::shared_ptr<CSSValue> defaultStyleValue_;
  folly::dynamic defaultStyleValueDynamic_;
  folly::dynamic reversingAdjustedStartValue_;

  virtual std::shared_ptr<CSSValue> createValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const = 0;
  virtual std::shared_ptr<CSSValue> createValue(
      const folly::dynamic &value) const = 0;
  virtual folly::dynamic interpolateValue(
      double progress,
      const std::shared_ptr<CSSValue> &fromValue,
      const std::shared_ptr<CSSValue> &toValue,
      const CSSValueInterpolationContext &context) const = 0;

 private:
  folly::dynamic convertOptionalToDynamic(
      const std::optional<std::shared_ptr<CSSValue>> &value) const;
  std::shared_ptr<CSSValue> getFallbackValue(
      const std::shared_ptr<const ShadowNode> &shadowNode) const;
  size_t getToKeyframeIndex(
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const;
};

template <typename... AllowedTypes>
class ValueInterpolator : public ValueInterpolatorBase {
  static_assert(
      (... && std::is_base_of<CSSValue, AllowedTypes>::value),
      "[Reanimated] ValueInterpolator: All interpolated types must inherit from CSSValue");

 public:
  using ValueType = CSSValueVariant<AllowedTypes...>;

  explicit ValueInterpolator(
      const PropertyPath &propertyPath,
      const ValueType &defaultStyleValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      : ValueInterpolatorBase(
            propertyPath,
            std::make_shared<ValueType>(defaultStyleValue),
            viewStylesRepository) {}

 protected:
  std::shared_ptr<CSSValue> createValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const override {
    return std::make_shared<ValueType>(rt, value);
  }
  std::shared_ptr<CSSValue> createValue(
      const folly::dynamic &value) const override {
    return std::make_shared<ValueType>(value);
  }

  folly::dynamic interpolateValue(
      double progress,
      const std::shared_ptr<CSSValue> &fromValue,
      const std::shared_ptr<CSSValue> &toValue,
      const CSSValueInterpolationContext &context) const override {
    const auto &from = std::static_pointer_cast<ValueType>(fromValue);
    const auto &to = std::static_pointer_cast<ValueType>(toValue);
    return from->interpolate(progress, *to).toDynamic();
  }
};

} // namespace reanimated::css
