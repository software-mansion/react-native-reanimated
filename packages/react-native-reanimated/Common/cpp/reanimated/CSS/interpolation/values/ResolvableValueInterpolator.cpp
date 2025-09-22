#include <reanimated/CSS/interpolation/values/ResolvableValueInterpolator.h>

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

namespace reanimated::css {

template <typename... AllowedTypes>
ResolvableValueInterpolator<AllowedTypes...>::ResolvableValueInterpolator(
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
      relativeProperty_(relativeProperty) {}

template <typename... AllowedTypes>
folly::dynamic ResolvableValueInterpolator<AllowedTypes...>::interpolateValue(
    double progress,
    const std::shared_ptr<CSSValue> &fromValue,
    const std::shared_ptr<CSSValue> &toValue,
    const ValueInterpolatorUpdateContext &context) const {
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

template class ResolvableValueInterpolator<CSSLength>;
template class ResolvableValueInterpolator<CSSLength, CSSKeyword>;

} // namespace reanimated::css
