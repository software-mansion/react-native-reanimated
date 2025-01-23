#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSDimension.h>
#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated {

template <typename... AllowedTypes>
class ResolvableValueInterpolator : public ValueInterpolator<AllowedTypes...> {
 public:
  using ValueType = typename ValueInterpolator<AllowedTypes...>::ValueType;

  ResolvableValueInterpolator(
      const PropertyPath &propertyPath,
      const ValueType &defaultStyleValue,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      RelativeTo relativeTo,
      std::string relativeProperty)
      : ValueInterpolator<AllowedTypes...>(
            propertyPath,
            defaultStyleValue,
            progressProvider,
            viewStylesRepository),
        relativeTo_(relativeTo),
        relativeProperty_(std::move(relativeProperty)) {}
  virtual ~ResolvableValueInterpolator() = default;

 protected:
  ValueType interpolate(
      double progress,
      const ValueType &fromValue,
      const ValueType &toValue,
      const ValueInterpolatorUpdateContext &context) const override {
    return fromValue.interpolate(
        progress,
        toValue,
        {.node = context.node,
         .viewStylesRepository = this->viewStylesRepository_,
         .relativeProperty = relativeProperty_,
         .relativeTo = relativeTo_});
  }

 private:
  RelativeTo relativeTo_;
  std::string relativeProperty_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
