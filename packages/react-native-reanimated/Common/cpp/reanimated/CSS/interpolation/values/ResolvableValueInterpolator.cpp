#include <reanimated/CSS/interpolation/values/ResolvableValueInterpolator.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <memory>

namespace reanimated::css {

template <typename... AllowedTypes>
ResolvableValueInterpolator<AllowedTypes...>::ResolvableValueInterpolator(
    const PropertyPath &propertyPath,
    const ValueType &defaultStyleValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const ResolvableValueInterpolatorConfig &config,
    std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &)>
        addToPropsBuilder)
    : SimpleValueInterpolator<AllowedTypes...>(
          propertyPath,
          defaultStyleValue,
          viewStylesRepository,
          addToPropsBuilder),
      config_(config),
      addToPropsBuilder_(addToPropsBuilder) {}

template <typename... AllowedTypes>
folly::dynamic ResolvableValueInterpolator<AllowedTypes...>::interpolateValue(
    double progress,
    const std::shared_ptr<CSSValue> &fromValue,
    const std::shared_ptr<CSSValue> &toValue,
    const ValueInterpolationContext &context,
    const std::shared_ptr<AnimatedPropsBuilder> &propsBuilder) const {
  const auto &from = std::static_pointer_cast<ValueType>(fromValue);
  const auto &to = std::static_pointer_cast<ValueType>(toValue);
  const auto interpolatedValue = from->interpolate(
      progress,
      *to,
      {.node = context.node,
       .fallbackInterpolateThreshold = context.fallbackInterpolateThreshold,
       .viewStylesRepository = this->viewStylesRepository_,
       .relativeProperty = config_.relativeProperty,
       .relativeTo = config_.relativeTo});

  addToPropsBuilder_(propsBuilder, interpolatedValue);

  return interpolatedValue.toDynamic();
}

template class ResolvableValueInterpolator<CSSLength>;
template class ResolvableValueInterpolator<CSSLength, CSSKeyword>;

} // namespace reanimated::css
