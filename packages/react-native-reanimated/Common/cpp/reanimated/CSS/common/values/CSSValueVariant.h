#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSValue.h>
#include <worklets/Tools/JSISerializer.h>

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
  if constexpr (std::is_same_v<L, R>)

/**
 * Checks if type has a constructor from jsi::Value
 */
template <typename T>
concept can_construct_from_jsi =
    requires(jsi::Runtime &rt, const jsi::Value &value) {
      { T(rt, value) };
    };

/**
 * Checks whether a type has canConstruct(...) for a a generic value
 */
template <typename Type, typename V>
static constexpr bool has_can_construct = requires(V &&value) {
  { Type::canConstruct(std::forward<V>(value)) } -> std::same_as<bool>;
};

/**
 * Checks whether a type has canConstruct(...) for jsi::Value
 */
template <typename Type, typename V>
static constexpr bool has_can_construct_jsi =
    requires(jsi::Runtime &rt, V &&value) {
      { Type::canConstruct(rt, std::forward<V>(value)) } -> std::same_as<bool>;
    };

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
   * Construct from any T that is or can construct one of the AllowedTypes
   * (chooses the first one that matches)
   */
  template <typename T>
  explicit CSSValueVariant(T &&value)
    requires((std::is_constructible_v<AllowedTypes, T> || ...))
  {
    // If T exactly matches one of AllowedTypes, store it directly:
    if constexpr ((std::is_same_v<std::remove_reference_t<T>, AllowedTypes> ||
                   ...)) {
      storage_ = std::forward<T>(value);
    } else {
      // Otherwise, try each type in turn
      if (!tryConstruct(std::forward<T>(value))) {
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
  {
    if (!tryConstruct(rt, jsiValue)) {
      throw std::runtime_error(
          "[Reanimated] No compatible type found for construction from: " +
          stringifyJSIValue(rt, jsiValue));
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
  template <typename T>
  bool tryConstruct(T &&value) {
    auto tryOne = [&]<typename Type>() -> bool {
      if constexpr (std::is_constructible_v<Type, T>) {
        if constexpr (has_can_construct<Type, T>) {
          // If the Type has a canConstruct method, check it first
          if (!Type::canConstruct(std::forward<T>(value))) {
            return false;
          }
        }
        storage_ = Type(std::forward<T>(value));
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
    auto tryOne = [&]<typename Type>() -> bool {
      if constexpr (can_construct_from_jsi<Type>) {
        if constexpr (has_can_construct_jsi<Type, const jsi::Value &>) {
          // If the Type has a canConstruct method, check it first
          if (!Type::canConstruct(rt, jsiValue)) {
            return false;
          }
        }
        storage_ = Type(rt, jsiValue);
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
