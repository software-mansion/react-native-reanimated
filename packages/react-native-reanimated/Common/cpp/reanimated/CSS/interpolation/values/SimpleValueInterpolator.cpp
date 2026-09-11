#include <reanimated/CSS/interpolation/values/SimpleValueInterpolator.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSDiscreteArray.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/complex/CSSBoxShadow.h>
#include <reanimated/CSS/svg/values/CSSLengthArray.h>
#include <reanimated/CSS/svg/values/SVGBrush.h>
#include <reanimated/CSS/svg/values/SVGPath.h>
#include <reanimated/CSS/svg/values/SVGStops.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <memory>

namespace reanimated::css {

template <typename... AllowedTypes>
SimpleValueInterpolator<AllowedTypes...>::SimpleValueInterpolator(
    const PropertyPath &propertyPath,
    const ValueType &defaultStyleValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : ValueInterpolator(propertyPath, std::make_shared<ValueType>(defaultStyleValue), viewStylesRepository) {}

template <typename... AllowedTypes>
std::shared_ptr<CSSValue> SimpleValueInterpolator<AllowedTypes...>::createValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return std::make_shared<ValueType>(rt, value);
}

template <typename... AllowedTypes>
std::shared_ptr<CSSValue> SimpleValueInterpolator<AllowedTypes...>::createValue(const folly::dynamic &value) const {
  return std::make_shared<ValueType>(value);
}

template <typename... AllowedTypes>
folly::dynamic SimpleValueInterpolator<AllowedTypes...>::interpolateValue(
    double progress,
    const std::shared_ptr<CSSValue> &fromValue,
    const std::shared_ptr<CSSValue> &toValue,
    const ValueInterpolationContext &context) const {
  if constexpr (std::is_same_v<InterpolationContextFor<AllowedTypes...>, ValueInterpolationContext>) {
    const auto &from = std::static_pointer_cast<ValueType>(fromValue);
    const auto &to = std::static_pointer_cast<ValueType>(toValue);
    return from->interpolate(progress, *to, context).toDynamic();
  } else {
    // Only instantiated as ResolvableValueInterpolator's base, which overrides
    // this and can build the context these values ask for.
    throw std::runtime_error(
        "[Reanimated] Cannot interpolate " + fromValue->toString() + " to " + toValue->toString() +
        ": this property is registered with an interpolator that cannot supply the context these values need");
  }
}

template class SimpleValueInterpolator<CSSLength>;
template class SimpleValueInterpolator<CSSLength, CSSKeyword>;
template class SimpleValueInterpolator<CSSDouble>;
template class SimpleValueInterpolator<CSSDouble, CSSKeyword>;
template class SimpleValueInterpolator<CSSTextDouble>;
template class SimpleValueInterpolator<CSSInteger>;
template class SimpleValueInterpolator<CSSIndex>;
template class SimpleValueInterpolator<CSSAngle>;
template class SimpleValueInterpolator<CSSColor>;
template class SimpleValueInterpolator<CSSBoolean>;
template class SimpleValueInterpolator<CSSDisplay>;
template class SimpleValueInterpolator<CSSKeyword>;
template class SimpleValueInterpolator<CSSBoxShadow>;
template class SimpleValueInterpolator<CSSDiscreteArray<CSSKeyword>>;

template class SimpleValueInterpolator<SVGPath>;
template class SimpleValueInterpolator<CSSLengthArray>;
template class SimpleValueInterpolator<SVGStops>;
template class SimpleValueInterpolator<SVGStrokeDashArray, CSSKeyword>;
template class SimpleValueInterpolator<SVGBrush>;

} // namespace reanimated::css
