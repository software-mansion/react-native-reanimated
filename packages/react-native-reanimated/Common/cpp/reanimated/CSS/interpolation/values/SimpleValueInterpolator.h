#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <memory>

namespace reanimated::css {

/**
 * Concrete implementation of ValueInterpolator for simple CSS values that don't
 * require resolution before interpolation. This class handles direct
 * interpolation between values without any additional processing or resolution.
 */
template <typename... AllowedTypes>
class SimpleValueInterpolator : public ValueInterpolator {
  static_assert(
      (... && std::is_base_of<CSSValue, AllowedTypes>::value),
      "[Reanimated] SimpleValueInterpolator: All interpolated types must inherit from CSSValue");

 public:
  using ValueType = CSSValueVariant<AllowedTypes...>;

  explicit SimpleValueInterpolator(
      const PropertyPath &propertyPath,
      const ValueType &defaultStyleValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

 protected:
  std::shared_ptr<CSSValue> createValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const override;

  std::shared_ptr<CSSValue> createValue(
      const folly::dynamic &value) const override;

  folly::dynamic interpolateValue(
      double progress,
      const std::shared_ptr<CSSValue> &fromValue,
      const std::shared_ptr<CSSValue> &toValue,
      const ValueInterpolatorUpdateContext &context) const override;
};

} // namespace reanimated::css
