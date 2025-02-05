#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSValue.h>
#include <worklets/Tools/JSISerializer.h>

#include <folly/json.h>

#include <stdexcept>
#include <string>
#include <type_traits>
#include <utility>
#include <variant>

namespace reanimated {

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

/**
 * Checks if type has a constructor from jsi::Value
 */
template <typename TValue>
concept can_construct_from_jsi =
    requires(jsi::Runtime &rt, const jsi::Value &value) {
      { TValue(rt, value) }; // NOLINT(readability/braces)
    }; // NOLINT(readability/braces)

/**
 * Checks if type has a constructor from folly::dynamic
 */
template <typename TValue>
concept can_construct_from_dynamic =
    requires(const folly::dynamic &value) {
      { TValue(value) }; // NOLINT(readability/braces)
    }; // NOLINT(readability/braces)

/**
 * Checks whether a type has canConstruct(...) for a a generic value
 */
template <typename TCSSValue, typename TValue>
static constexpr bool has_can_construct = requires(TValue &&value) {
  {
    TCSSValue::canConstruct(std::forward<TValue>(value))
  } -> std::same_as<bool>;
}; // NOLINT(readability/braces)

/**
 * Checks whether a type has canConstruct(...) for jsi::Value
 */
template <typename TCSSValue, typename TValue>
static constexpr bool has_can_construct_jsi =
    requires(jsi::Runtime &rt, TValue &&value) {
      {
        TCSSValue::canConstruct(rt, std::forward<TValue>(value))
      } -> std::same_as<bool>;
    }; // NOLINT(readability/braces)
    
/**
 * Checks whether a type has canConstruct(...) for dynamic
 */
template <typename TCSSValue, typename TValue>
static constexpr bool has_can_construct_dynamic =
    requires(TValue &&value) {
      {
        TCSSValue::canConstruct(std::forward<TValue>(value))
      } -> std::same_as<bool>;
    }; // NOLINT(readability/braces)

/**
 * CSSValueVariant
 *
 * A std::variant-based container for multiple CSSValue-derived types.
 */
template <typename... AllowedTypes>
class CSSValueVariant final : public CSSValue {
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
            "[RNReanimated] No compatible type found for construction");
      }
    }
  }

  /**
   * Construct from jsi::Value if it matches any AllowedType's constructor
   * (chooses the first one that matches)
   */
  CSSValueVariant(jsi::Runtime &rt, const jsi::Value &jsiValue)
    requires((can_construct_from_jsi<AllowedTypes> || ...))
  { // NOLINT(whitespace/braces)
    if (!tryConstruct(rt, jsiValue)) {
      throw std::runtime_error(
          "[Reanimated] No compatible type found for construction from: " +
          stringifyJSIValue(rt, jsiValue));
    }
  }
  
  CSSValueVariant(const folly::dynamic &value)
    requires((can_construct_from_dynamic<AllowedTypes> || ...))
  { // NOLINT(whitespace/braces)
    if (!tryConstructFromDynamic(value)) {
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

  CSSValueType type() const override {
    return std::visit([](const auto &v) { return v.type(); }, storage_);
  }

  jsi::Value toJSIValue(jsi::Runtime &rt) const override {
    return std::visit(
        [&rt](const auto &v) { return v.toJSIValue(rt); }, storage_);
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
        if constexpr (has_can_construct<TCSSValue, TValue>) {
          // If the TCSSValue has a canConstruct method, check it first
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
      if constexpr (can_construct_from_jsi<TCSSValue>) {
        if constexpr (has_can_construct_jsi<TCSSValue, const jsi::Value &>) {
          // If the TCSSValue has a canConstruct method, check it first
          if (!TCSSValue::canConstruct(rt, jsiValue)) {
            return false;
          }
        }
        storage_ = TCSSValue(rt, jsiValue);
        return true;
      }
      return false;
    };

    // Try constructing with each allowed type until one succeeds
    return (tryOne.template operator()<AllowedTypes>() || ...);
  }
  
  /**
   * Tries to construct type from a given folly::dynamic
   */
  bool tryConstructFromDynamic(const folly::dynamic &value) {
    auto tryOne = [&]<typename TCSSValue>() -> bool {
      if constexpr (can_construct_from_dynamic<TCSSValue>) {
        if constexpr (has_can_construct_dynamic<TCSSValue, const folly::dynamic &>) {
          // If the TCSSValue has a canConstruct method, check it first
          if (!TCSSValue::canConstruct(value)) {
            return false;
          }
        }
        storage_ = TCSSValue(value);
        return true;
      }
      return false;
    };

    // Try constructing with each allowed type until one succeeds
    return (tryOne.template operator()<AllowedTypes>() || ...);
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
