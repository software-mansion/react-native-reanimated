#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSDiscreteArray.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/CSSValueVariant.h>
#include <reanimated/CSS/svg/values/SVGLength.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <vector>

namespace reanimated::css {

template <typename... AllowedTypes>
CSSValueVariant<AllowedTypes...>::CSSValueVariant(
    std::variant<AllowedTypes...> &&storage)
    : storage_(std::move(storage)) {}

template <typename... AllowedTypes>
CSSValueVariant<AllowedTypes...>::CSSValueVariant(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  auto tryOne = [&]<typename TCSSValue>() -> bool {
    // We have to check in a runtime if the type can be constructed from the
    // provided jsi::Value. The first match will be used to construct the
    // CSS value.
    if (!TCSSValue::canConstruct(rt, jsiValue)) {
      return false;
    }
    storage_ = TCSSValue(rt, jsiValue);
    return true;
  };

  // Try constructing with each allowed type until one succeeds
  if (!(tryOne.template operator()<AllowedTypes>() || ...)) {
    throw std::runtime_error(
        "[Reanimated] No compatible type found for construction from: " +
        stringifyJSIValue(rt, jsiValue));
  }
}

template <typename... AllowedTypes>
CSSValueVariant<AllowedTypes...>::CSSValueVariant(const folly::dynamic &value) {
  auto tryOne = [&]<typename TCSSValue>() -> bool {
    // We have to check in a runtime if the type can be constructed from the
    // provided folly::dynamic. The first match will be used to construct the
    // CSS value.
    if (!TCSSValue::canConstruct(value)) {
      return false;
    }
    storage_ = TCSSValue(value);
    return true;
  };

  // Try constructing with each allowed type until one succeeds
  if (!(tryOne.template operator()<AllowedTypes>() || ...)) {
    throw std::runtime_error(
        "[Reanimated] No compatible type found for construction from: " +
        folly::toJson(value));
  }
}

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
    const ValueInterpolatorUpdateContext &context) const {
  if (storage_.index() != to.storage_.index()) {
    return fallbackInterpolate(progress, to);
  }

  return std::visit(
      [&](const auto &fromValue, const auto &toValue) -> CSSValueVariant {
        REA_IF_SAME_TYPE(fromValue, toValue) {
          if constexpr (Resolvable<L>) {
            throw std::runtime_error(
                "[Reanimated] Resolvable value cannot be interpolated as non-resolvable");
          } else {
            return CSSValueVariant(fromValue.interpolate(progress, toValue));
          }
        }
        return fallbackInterpolate(progress, to);
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
    return fallbackInterpolate(progress, to);
  }

  return std::visit(
      [&](const auto &fromValue, const auto &toValue) -> CSSValueVariant {
        REA_IF_SAME_TYPE(fromValue, toValue) {
          if constexpr (Resolvable<L>) {
            return CSSValueVariant(
                fromValue.interpolate(progress, toValue, context));
          } else {
            throw std::runtime_error(
                "[Reanimated] Non-resolvable value cannot be interpolated as resolvable");
          }
        }
        return fallbackInterpolate(progress, to);
      },
      storage_,
      to.storage_);
}

template <typename... AllowedTypes>
CSSValueVariant<AllowedTypes...>
CSSValueVariant<AllowedTypes...>::fallbackInterpolate(
    const double progress,
    const CSSValueVariant &to) const {
  return progress < 0.5 ? *this : to;
}

template class CSSValueVariant<CSSLength>;
template class CSSValueVariant<CSSLength, CSSKeyword>;
template class CSSValueVariant<CSSDouble>;
template class CSSValueVariant<CSSDouble, CSSKeyword>;
template class CSSValueVariant<CSSInteger>;
template class CSSValueVariant<CSSKeyword>;
template class CSSValueVariant<CSSAngle>;
template class CSSValueVariant<CSSBoolean>;
template class CSSValueVariant<CSSColor>;
template class CSSValueVariant<CSSDisplay>;
template class CSSValueVariant<CSSDiscreteArray<CSSKeyword>>;
#ifdef ANDROID
template class CSSValueVariant<CSSShadowRadiusAndroid>;
#endif

template class CSSValueVariant<SVGLength>;
template class CSSValueVariant<SVGLength, CSSKeyword>;
template class CSSValueVariant<SVGStrokeDashArray, CSSKeyword>;

} // namespace reanimated::css
