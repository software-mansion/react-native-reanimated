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
#include <reanimated/CSS/svg/values/SVGLength.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

namespace reanimated::css {

template <typename... AllowedTypes>
SimpleValueInterpolator<AllowedTypes...>::SimpleValueInterpolator(
    const PropertyPath &propertyPath,
    const ValueType &defaultStyleValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : ValueInterpolator(
          propertyPath,
          std::make_shared<ValueType>(defaultStyleValue),
          viewStylesRepository) {}

template <typename... AllowedTypes>
std::shared_ptr<CSSValue> SimpleValueInterpolator<AllowedTypes...>::createValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return std::make_shared<ValueType>(rt, value);
}

template <typename... AllowedTypes>
std::shared_ptr<CSSValue> SimpleValueInterpolator<AllowedTypes...>::createValue(
    const folly::dynamic &value) const {
  return std::make_shared<ValueType>(value);
}

template <typename... AllowedTypes>
folly::dynamic SimpleValueInterpolator<AllowedTypes...>::interpolateValue(
    double progress,
    const std::shared_ptr<CSSValue> &fromValue,
    const std::shared_ptr<CSSValue> &toValue,
    const ValueInterpolatorUpdateContext &context) const {
  const auto &from = std::static_pointer_cast<ValueType>(fromValue);
  const auto &to = std::static_pointer_cast<ValueType>(toValue);
  return from->interpolate(progress, *to, context).toDynamic();
}

template class SimpleValueInterpolator<CSSLength>;
template class SimpleValueInterpolator<CSSLength, CSSKeyword>;
template class SimpleValueInterpolator<CSSDouble>;
template class SimpleValueInterpolator<CSSDouble, CSSKeyword>;
template class SimpleValueInterpolator<CSSInteger>;
template class SimpleValueInterpolator<CSSAngle>;
template class SimpleValueInterpolator<CSSColor>;
template class SimpleValueInterpolator<CSSBoolean>;
template class SimpleValueInterpolator<CSSDisplay>;
template class SimpleValueInterpolator<CSSKeyword>;
template class SimpleValueInterpolator<CSSDiscreteArray<CSSKeyword>>;
#ifdef ANDROID
template class SimpleValueInterpolator<CSSShadowRadiusAndroid>;
#endif

template class SimpleValueInterpolator<SVGLength>;
template class SimpleValueInterpolator<SVGLength, CSSKeyword>;
template class SimpleValueInterpolator<SVGStrokeDashArray, CSSKeyword>;

} // namespace reanimated::css
