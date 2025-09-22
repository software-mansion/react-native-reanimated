#pragma once

#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/interpolation/values/SimpleValueInterpolator.h>

#include <memory>
#include <string>
#include <utility>

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
      RelativeTo relativeTo,
      std::string relativeProperty)
      : SimpleValueInterpolator<AllowedTypes...>(
            propertyPath,
            defaultStyleValue,
            viewStylesRepository),
        relativeTo_(relativeTo),
        relativeProperty_(std::move(relativeProperty)) {}

 protected:
  folly::dynamic interpolateValue(
      double progress,
      const std::shared_ptr<CSSValue> &fromValue,
      const std::shared_ptr<CSSValue> &toValue,
      const ValueInterpolatorUpdateContext &context) const override {
    const auto &from = std::static_pointer_cast<ValueType>(fromValue);
    const auto &to = std::static_pointer_cast<ValueType>(toValue);
    return from
        ->interpolate(
            progress,
            *to,
            {.node = context.node,
             .viewStylesRepository = this->viewStylesRepository_,
             .relativeProperty = relativeProperty_,
             .relativeTo = relativeTo_})
        .toDynamic();
  }

 private:
  RelativeTo relativeTo_;
  std::string relativeProperty_;
};

} // namespace reanimated::css
