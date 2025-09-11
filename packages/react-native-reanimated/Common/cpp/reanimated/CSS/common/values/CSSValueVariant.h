#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>
#include <worklets/Tools/JSISerializer.h>

#include <folly/json.h>

#include <stdexcept>
#include <string>
#include <type_traits>
#include <utility>
#include <variant>

namespace reanimated::css {

using namespace worklets;

/**
 * Macro to check if two lambda parameters have the same reference-removed type.
 *
 * Usage:
 *   REA_IF_SAME_TYPE(lhs, rhs) {
 *     // same-type block
 *   } else {
 *     // mismatch block
 *   }
 */
#define REA_IF_SAME_TYPE(lhs, rhs)                  \
  using L = std::remove_reference_t<decltype(lhs)>; \
  using R = std::remove_reference_t<decltype(rhs)>; \
  if constexpr (std::is_same_v<L, R>) // NOLINT(readability/braces)

// Checks whether a type has canConstruct(...) for a generic value
template <typename TCSSValue, typename TValue>
concept ValueConstructibleCSSValue = requires(TValue &&value) {
  {
    TCSSValue::canConstruct(std::forward<TValue>(value))
  } -> std::same_as<bool>;
}; // NOLINT(readability/braces)

// Checks whether a type can be constructed from a jsi::Value
template <typename TCSSValue>
concept JSIConstructibleCSSValue =
    requires(jsi::Runtime &rt, const jsi::Value &value) {
      { TCSSValue::canConstruct(rt, value) } -> std::same_as<bool>;
      { TCSSValue(rt, value) } -> std::same_as<TCSSValue>;
    }; // NOLINT(readability/braces)

// Checks whether a type can be constructed from a folly::dynamic
template <typename TCSSValue>
concept DynamicConstructibleCSSValue = requires(const folly::dynamic &value) {
  { TCSSValue::canConstruct(value) } -> std::same_as<bool>;
  { TCSSValue(value) } -> std::same_as<TCSSValue>;
}; // NOLINT(readability/braces)

/**
 * CSSValueVariant
 *
 * A std::variant-based container for multiple CSSValue-derived types.
 */
template <typename... AllowedTypes>
class CSSValueVariant final : public CSSValue {
  static_assert(
      (CSSValueDerived<AllowedTypes> && ...),
      "CSSValueVariant accepts only CSSValue-derived types");
  static_assert(
      (JSIConstructibleCSSValue<AllowedTypes> && ...),
      "CSSValueVariant accepts only types that can be constructed from a jsi::Value");
  static_assert(
      (DynamicConstructibleCSSValue<AllowedTypes> && ...),
      "CSSValueVariant accepts only types that can be constructed from a folly::dynamic");

 public:
  CSSValueVariant() = default;

  /**
   * Construct from any value that is or can construct one of the AllowedTypes
   * (chooses the first one that matches)
   */
  explicit CSSValueVariant(auto &&value)
    requires((std::is_constructible_v<AllowedTypes, decltype(value)> || ...))
  { // NOLINT(whitespace/braces)
    using ValueType = decltype(value);

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

  /**
   * Construct from jsi::Value if it matches any AllowedType's constructor
   * (chooses the first one that matches)
   */
  CSSValueVariant(jsi::Runtime &rt, const jsi::Value &jsiValue) {
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

  /**
   * Construct from folly::dynamic if it matches any AllowedType's constructor
   * (chooses the first one that matches)
   */
  explicit CSSValueVariant(const folly::dynamic &value) {
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

  bool operator==(const CSSValueVariant &other) const;

  bool operator==(const CSSValue &other) const;

  folly::dynamic toDynamic() const override;

  std::string toString() const override;

  /**
   * Interpolate (non-resolvable)
   */
  CSSValueVariant interpolate(
      const double progress,
      const CSSValueVariant &to,
      const CSSValueInterpolationContext &context) const;

  /**
   * Interpolate (resolvable)
   */
  CSSValueVariant interpolate(
      const double progress,
      const CSSValueVariant &to,
      const CSSResolvableValueInterpolationContext &context) const;

 private:
  std::variant<AllowedTypes...> storage_;

  CSSValueVariant fallbackInterpolate(
      const double progress,
      const CSSValueVariant &to,
      const double fallbackInterpolateThreshold) const;
};

} // namespace reanimated::css
