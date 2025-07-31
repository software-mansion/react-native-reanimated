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

  bool operator==(const CSSValueVariant &other) const {
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

  bool operator==(const CSSValue &other) const {
    if (auto *o = dynamic_cast<const CSSValueVariant *>(&other)) {
      return *this == *o;
    }
    return false;
  }

  folly::dynamic toDynamic() const override {
    return std::visit([](const auto &v) { return v.toDynamic(); }, storage_);
  }

  std::string toString() const override {
    return std::visit([](const auto &v) { return v.toString(); }, storage_);
  }

  /**
   * Interpolate (non-resolvable)
   */
  CSSValueVariant interpolate(double progress, const CSSValueVariant &to)
      const {
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

  /**
   * Interpolate (resolvable)
   */
  CSSValueVariant interpolate(
      double progress,
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

 private:
  std::variant<AllowedTypes...> storage_;

  CSSValueVariant fallbackInterpolate(
      double progress,
      const CSSValueVariant &to) const {
    return (progress < 0.5) ? *this : to;
  }

  /**
   * Tries to construct type from a given value
   */
  template <typename TValue>
  bool tryConstruct(TValue &&value) {
    auto tryOne = [&]<typename TCSSValue>() -> bool {
      if constexpr (std::is_constructible_v<TCSSValue, TValue>) {
        if constexpr (ValueConstructibleCSSValue<TCSSValue, TValue>) {
          // For construction from a non-jsi::Value, we perform a runtime
          // canConstruct check only if the type has a canConstruct method.
          // (this is needed e.g. when different CSS value types can be
          // constructed from the same value type, like CSSLength and
          // CSSKeyword)
          if (!TCSSValue::canConstruct(std::forward<TValue>(value))) {
            return false;
          }
        }
        storage_ = TCSSValue(std::forward<TValue>(value));
        return true;
      }
      return false;
    };

    // Try constructing with each allowed type until one succeeds
    return (tryOne.template operator()<AllowedTypes>() || ...);
  }

  /**
   * Tries to construct type from a given jsi::Value
   */
  bool tryConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
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
    return (tryOne.template operator()<AllowedTypes>() || ...);
  }

  /**
   * Tries to construct type from a given folly::dynamic
   */
  bool tryConstruct(const folly::dynamic &value) {
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
    return (tryOne.template operator()<AllowedTypes>() || ...);
  }
};

} // namespace reanimated::css
