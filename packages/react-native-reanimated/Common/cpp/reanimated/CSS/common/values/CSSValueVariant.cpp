#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSDiscreteArray.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/CSSValueVariant.h>
#include <reanimated/CSS/common/values/complex/CSSBoxShadow.h>
#include <reanimated/CSS/svg/values/SVGLength.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <vector>

namespace reanimated::css {

template <typename... AllowedTypes>
bool CSSValueVariant<AllowedTypes...>::operator==(
    const CSSValueVariant &other) const {
  if (storage_.index() != other.storage_.index()) {
    return false;
  }

  return std::visit(
      [](const auto &lhs, const auto &rhs) {
        REA_IF_SAME_TYPE(lhs, rhs) {
          return lhs == rhs;
        }
        return false;
      },
      storage_,
      other.storage_);
}

template <typename... AllowedTypes>
bool CSSValueVariant<AllowedTypes...>::operator==(const CSSValue &other) const {
  if (auto *o = dynamic_cast<const CSSValueVariant *>(&other)) {
    return *this == *o;
  }
  return false;
}

template <typename... AllowedTypes>
folly::dynamic CSSValueVariant<AllowedTypes...>::toDynamic() const {
  return std::visit([](const auto &v) { return v.toDynamic(); }, storage_);
}

template <typename... AllowedTypes>
std::string CSSValueVariant<AllowedTypes...>::toString() const {
  return std::visit([](const auto &v) { return v.toString(); }, storage_);
}

template <typename... AllowedTypes>
CSSValueVariant<AllowedTypes...> CSSValueVariant<AllowedTypes...>::interpolate(
    const double progress,
    const CSSValueVariant &to,
    const CSSValueInterpolationContext &context) const {
  if (storage_.index() != to.storage_.index()) {
    return fallbackInterpolate(
        progress, to, context.fallbackInterpolateThreshold);
  }

  return std::visit(
      [&](const auto &fromValue, const auto &toValue) -> CSSValueVariant {
        REA_IF_SAME_TYPE(fromValue, toValue) {
          if constexpr (Resolvable<L>) {
            throw std::runtime_error(
                "[Reanimated] Resolvable value cannot be interpolated as non-resolvable");
          } else if (fromValue.canInterpolateTo(toValue)) {
            return CSSValueVariant(fromValue.interpolate(progress, toValue));
          }
        }
        return fallbackInterpolate(
            progress, to, context.fallbackInterpolateThreshold);
      },
      storage_,
      to.storage_);
}

template <typename... AllowedTypes>
CSSValueVariant<AllowedTypes...> CSSValueVariant<AllowedTypes...>::interpolate(
    const double progress,
    const CSSValueVariant &to,
    const CSSResolvableValueInterpolationContext &context) const {
  if (storage_.index() != to.storage_.index()) {
    return fallbackInterpolate(
        progress, to, context.fallbackInterpolateThreshold);
  }

  return std::visit(
      [&](const auto &fromValue, const auto &toValue) -> CSSValueVariant {
        REA_IF_SAME_TYPE(fromValue, toValue) {
          if constexpr (!Resolvable<L>) {
            throw std::runtime_error(
                "[Reanimated] Non-resolvable value cannot be interpolated as resolvable");
          } else if (fromValue.canInterpolateTo(toValue)) {
            return CSSValueVariant(
                fromValue.interpolate(progress, toValue, context));
          }
        }
        return fallbackInterpolate(
            progress, to, context.fallbackInterpolateThreshold);
      },
      storage_,
      to.storage_);
}

template <typename... AllowedTypes>
CSSValueVariant<AllowedTypes...>
CSSValueVariant<AllowedTypes...>::fallbackInterpolate(
    const double progress,
    const CSSValueVariant &to,
    const double fallbackInterpolateThreshold) const {
  return (progress < fallbackInterpolateThreshold) ? *this : to;
}

template class CSSValueVariant<CSSLength>;
template class CSSValueVariant<CSSLength, CSSKeyword>;
template class CSSValueVariant<CSSDouble>;
template class CSSValueVariant<CSSDouble, CSSKeyword>;
template class CSSValueVariant<CSSDouble, CSSLength>;
template class CSSValueVariant<CSSInteger>;
template class CSSValueVariant<CSSKeyword>;
template class CSSValueVariant<CSSAngle>;
template class CSSValueVariant<CSSBoolean>;
template class CSSValueVariant<CSSColor>;
template class CSSValueVariant<CSSDisplay>;
template class CSSValueVariant<SVGLength>;
template class CSSValueVariant<SVGStrokeDashArray>;
template class CSSValueVariant<SVGStrokeDashArray, CSSKeyword>;
template class CSSValueVariant<CSSBoxShadow>;
template class CSSValueVariant<CSSDiscreteArray<CSSKeyword>>;

template CSSValueVariant<SVGLength, CSSKeyword>
CSSValueVariant<SVGLength, CSSKeyword>::interpolate(
    double,
    const CSSValueVariant<SVGLength, CSSKeyword> &,
    const CSSValueInterpolationContext &) const;

} // namespace reanimated::css
