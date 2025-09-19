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
template <typename TValue>
CSSValueVariant<AllowedTypes...>::CSSValueVariant(TValue &&value)
  requires((std::is_constructible_v<AllowedTypes, TValue> || ...))
{ // NOLINT(whitespace/braces)
  using ValueType = TValue;

  // If value type exactly matches one of AllowedTypes, store it directly:
  if constexpr ((std::is_same_v<
                     std::remove_reference_t<ValueType>,
                     AllowedTypes> ||
                 ...)) {
    storage_ = std::forward<ValueType>(value);
  } else {
    // Otherwise, try to construct the CSSValue from each type in turn
    auto tryOne = [&]<typename TCSSValue>() -> bool {
      if constexpr (std::is_constructible_v<TCSSValue, ValueType>) {
        if constexpr (ValueConstructibleCSSValue<TCSSValue, ValueType>) {
          // For construction from a non-jsi::Value, we perform a runtime
          // canConstruct check only if the type has a canConstruct method.
          // (this is needed e.g. when different CSS value types can be
          // constructed from the same value type, like CSSLength and
          // CSSKeyword)
          if (!TCSSValue::canConstruct(std::forward<ValueType>(value))) {
            return false;
          }
        }
        storage_ = TCSSValue(std::forward<ValueType>(value));
        return true;
      }
      return false;
    };

    // Try constructing with each allowed type until one succeeds
    if (!(tryOne.template operator()<AllowedTypes>() || ...)) {
      throw std::runtime_error(
          "[Reanimated] No compatible type found for construction");
    }
  }
}

template <typename... AllowedTypes>
CSSValueVariant<AllowedTypes...>::CSSValueVariant(const char *value) {
  *this = CSSValueVariant(std::string(value));
}

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
template class CSSValueVariant<CSSInteger>;
template class CSSValueVariant<CSSKeyword>;
template class CSSValueVariant<CSSAngle>;
template class CSSValueVariant<CSSBoolean>;
template class CSSValueVariant<CSSColor>;
template class CSSValueVariant<CSSDisplay>;
template class CSSValueVariant<CSSBoxShadow>;
template class CSSValueVariant<CSSDiscreteArray<CSSKeyword>>;

template class CSSValueVariant<SVGLength>;
template class CSSValueVariant<SVGLength, CSSKeyword>;
template class CSSValueVariant<SVGStrokeDashArray, CSSKeyword>;

template CSSValueVariant<CSSBoolean>::CSSValueVariant(bool const &);
template CSSValueVariant<CSSInteger>::CSSValueVariant(int const &);
template CSSValueVariant<CSSLength>::CSSValueVariant(int const &);
template CSSValueVariant<CSSDisplay>::CSSValueVariant(char const &);
template CSSValueVariant<CSSBoxShadow>::CSSValueVariant(CSSBoxShadow const &);
template CSSValueVariant<CSSColor>::CSSValueVariant(CSSColor const &);
template CSSValueVariant<CSSDouble>::CSSValueVariant(int const &);
template CSSValueVariant<CSSDouble, CSSKeyword>::CSSValueVariant(int const &);
template CSSValueVariant<CSSLength, CSSKeyword>::CSSValueVariant(int const &);
template CSSValueVariant<CSSDiscreteArray<CSSKeyword>>::CSSValueVariant(
    std::vector<CSSKeyword> const &);
template CSSValueVariant<CSSAngle>::CSSValueVariant(int const &);

template CSSValueVariant<SVGStrokeDashArray, CSSKeyword>::CSSValueVariant(
    SVGStrokeDashArray const &);
template CSSValueVariant<SVGLength>::CSSValueVariant(int const &);
template CSSValueVariant<SVGLength, CSSKeyword>::CSSValueVariant(int const &);

} // namespace reanimated::css
