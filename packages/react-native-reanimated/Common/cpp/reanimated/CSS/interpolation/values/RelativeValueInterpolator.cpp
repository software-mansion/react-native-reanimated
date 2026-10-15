#include <reanimated/CSS/interpolation/values/RelativeValueInterpolator.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/svg/values/CSSLengthArray.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <memory>

namespace reanimated::css {

template <typename... AllowedTypes>
RelativeValueInterpolator<AllowedTypes...>::RelativeValueInterpolator(
    const PropertyPath &propertyPath,
    const ValueType &defaultStyleValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const RelativeValueInterpolatorConfig &config)
    : SimpleValueInterpolator<AllowedTypes...>(propertyPath, defaultStyleValue, viewStylesRepository),
      config_(config) {}

template <typename... AllowedTypes>
folly::dynamic RelativeValueInterpolator<AllowedTypes...>::interpolateValue(
    double progress,
    const std::shared_ptr<CSSValue> &fromValue,
    const std::shared_ptr<CSSValue> &toValue,
    const ValueInterpolationContext &context) const {
  const auto &from = std::static_pointer_cast<ValueType>(fromValue);
  const auto &to = std::static_pointer_cast<ValueType>(toValue);
  return from
      ->interpolate(
          progress,
          *to,
          RelativeValueInterpolationContext{
              .node = context.node,
              .fallbackInterpolateThreshold = context.fallbackInterpolateThreshold,
              .viewStylesRepository = this->viewStylesRepository_,
              .relativeProperty = config_.relativeProperty,
              .relativeTo = config_.relativeTo})
      .toDynamic();
}

template class RelativeValueInterpolator<CSSLength>;
template class RelativeValueInterpolator<CSSLength, CSSKeyword>;
template class RelativeValueInterpolator<CSSLengthArray>;
template class RelativeValueInterpolator<SVGStrokeDashArray, CSSKeyword>;

} // namespace reanimated::css
