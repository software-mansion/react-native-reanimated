#pragma once

#include <reanimated/CSS/common/values/CSSDimension.h>
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
      RelativeTo relativeTo,
      std::string relativeProperty)
      : ValueInterpolator<AllowedTypes...>(propertyPath, defaultStyleValue),
        relativeTo_(relativeTo),
        relativeProperty_(std::move(relativeProperty)) {}
  virtual ~ResolvableValueInterpolator() = default;

 protected:
  ValueType interpolateValue(
      double progress,
      const ValueType &fromValue,
      const ValueType &toValue,
      const PropertyInterpolatorUpdateContext &context) const override {
    return fromValue.interpolate(
        progress,
        toValue,
        {
            .node = context.node,
            .viewStylesRepository = context.viewStylesRepository,
            .relativeTo = relativeTo_,
            .relativeProperty = relativeProperty_,
        });
  }

 private:
  RelativeTo relativeTo_;
  std::string relativeProperty_;
};

} // namespace reanimated::css
