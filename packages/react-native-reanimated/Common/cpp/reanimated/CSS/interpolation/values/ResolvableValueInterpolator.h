#pragma once

#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/values/SimpleValueInterpolator.h>

#include <memory>

namespace reanimated::css {

/**
 * Concrete implementation of ValueInterpolator for CSS values that require
 * resolution before interpolation. This class handles interpolation of relative
 * values (e.g., percentage length values) that need to be resolved to absolute
 * values using the context describing the ShadowNode before the interpolation
 * can occur.
 */
template <typename... AllowedTypes>
class ResolvableValueInterpolator final
    : public SimpleValueInterpolator<AllowedTypes...> {
  static_assert(
      (... && std::is_base_of<CSSValue, AllowedTypes>::value),
      "[Reanimated] ResolvableValueInterpolator: All interpolated types must inherit from CSSValue");

 public:
  using ValueType =
      typename SimpleValueInterpolator<AllowedTypes...>::ValueType;

  explicit ResolvableValueInterpolator(
      const PropertyPath &propertyPath,
      const ValueType &defaultStyleValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const ResolvableValueInterpolatorConfig &config)
      : SimpleValueInterpolator<AllowedTypes...>(
            propertyPath,
            defaultStyleValue,
            viewStylesRepository),
        config_(config) {}

 protected:
  folly::dynamic interpolateValue(
      double progress,
      const std::shared_ptr<CSSValue> &fromValue,
      const std::shared_ptr<CSSValue> &toValue,
      const ValueInterpolationContext &context) const override {
    const auto &from = std::static_pointer_cast<ValueType>(fromValue);
    const auto &to = std::static_pointer_cast<ValueType>(toValue);
    return from
        ->interpolate(
            progress,
            *to,
            {.node = context.node,
             .fallbackInterpolateThreshold =
                 context.fallbackInterpolateThreshold,
             .viewStylesRepository = this->viewStylesRepository_,
             .relativeProperty = config_.relativeProperty,
             .relativeTo = config_.relativeTo})
        .toDynamic();
  }

 private:
  const ResolvableValueInterpolatorConfig &config_;
};

} // namespace reanimated::css
