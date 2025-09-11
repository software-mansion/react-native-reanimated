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
 * REA_IF_SAME_TYPE(lhs, rhs) {
 * // same-type block
 * } else {
 * // mismatch block
 * }
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
   * Construct from any TValue that is or can construct one of the AllowedTypes
   * (chooses the first one that matches)
   */
  template <typename TValue>
  explicit CSSValueVariant(TValue &&value)
    requires((std::is_constructible_v<AllowedTypes, TValue> || ...))
  { // NOLINT(whitespace/braces)
    // If TValue exactly matches one of AllowedTypes, store it directly:
    if constexpr ((std::is_same_v<
                       std::remove_reference_t<TValue>,
                       AllowedTypes> ||
                   ...)) {
      storage_ = std::forward<TValue>(value);
    } else {
      // Otherwise, try each type in turn
      if (!tryConstruct(std::forward<TValue>(value))) {
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
    if (!tryConstruct(rt, jsiValue)) {
      throw std::runtime_error(
          "[Reanimated] No compatible type found for construction from: " +
          stringifyJSIValue(rt, jsiValue));
    }
  }

  explicit CSSValueVariant(const folly::dynamic &value) {
    if (!tryConstruct(value)) {
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

  /**
   * Tries to construct type from a given value
   */
  template <typename TValue>
  bool tryConstruct(TValue &&value);

  bool tryConstruct(const char *value);

  /**
   * Tries to construct type from a given jsi::Value
   */
  bool tryConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  /**
   * Tries to construct type from a given folly::dynamic
   */
  bool tryConstruct(const folly::dynamic &value);
};

} // namespace reanimated::css
