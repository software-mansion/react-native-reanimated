#pragma once

#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

template <typename... AllowedTypes>
class ResolvableValueInterpolator : public ValueInterpolator<AllowedTypes...> {
 public:
  using ValueType = typename ValueInterpolator<AllowedTypes...>::ValueType;

  ResolvableValueInterpolator(
      const PropertyPath &propertyPath,
      const ValueType &defaultStyleValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const ResolvableValueInterpolatorConfig &config)
      : ValueInterpolator<AllowedTypes...>(
            propertyPath,
            defaultStyleValue,
            viewStylesRepository),
        config_(config) {}
  virtual ~ResolvableValueInterpolator() = default;

 protected:
  folly::dynamic interpolateValue(
      double progress,
      const std::shared_ptr<CSSValue> &fromValue,
      const std::shared_ptr<CSSValue> &toValue,
      const CSSValueInterpolationContext &context) const override {
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
