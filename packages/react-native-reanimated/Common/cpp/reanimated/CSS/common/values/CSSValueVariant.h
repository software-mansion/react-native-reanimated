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
   * Construct from std::variant storage directly
   */
  explicit CSSValueVariant(std::variant<AllowedTypes...> &&storage);

  /**
   * Construct from jsi::Value if it matches any AllowedType's constructor
   * (chooses the first one that matches)
   */
  explicit CSSValueVariant(jsi::Runtime &rt, const jsi::Value &jsiValue);

  /**
   * Construct from folly::dynamic if it matches any AllowedType's constructor
   * (chooses the first one that matches)
   */
  explicit CSSValueVariant(const folly::dynamic &value);

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
      const ValueInterpolatorUpdateContext &context) const;

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
      const CSSValueVariant &to) const;
};

} // namespace reanimated::css
