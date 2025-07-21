#pragma once

#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <string>
#include <type_traits>

namespace reanimated::css {

using namespace facebook;

enum class RelativeTo {
  Parent,
  Self,
};

struct CSSResolvableValueInterpolationContext {
  const std::shared_ptr<const ShadowNode> &node;
  const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
  const std::string &relativeProperty;
  const RelativeTo relativeTo;
};

struct CSSValue {
  // This field should be overridden in discrete value types
  static constexpr bool is_discrete_value = false;

  virtual ~CSSValue() = default;

  virtual folly::dynamic toDynamic() const = 0;
  virtual std::string toString() const = 0;
};

// Base for leaf values that can be interpolated without resolution
template <typename TDerived>
struct CSSSimpleValue : public CSSValue {
  static constexpr bool is_resolvable_value = false;

  virtual TDerived interpolate(double progress, const TDerived &to) const = 0;
};

// Base for leaf values that need resolution before interpolation
template <typename TDerived, typename TResolved = TDerived>
struct CSSResolvableValue : public CSSValue {
  static constexpr bool is_resolvable_value = true;

  virtual TDerived interpolate(
      double progress,
      const TDerived &to,
      const CSSResolvableValueInterpolationContext &context) const = 0;
  virtual std::optional<TResolved> resolve(
      const CSSResolvableValueInterpolationContext &context) const = 0;
};

// Checks if a type is a resolvable value that needs resolution before
// interpolation
template <typename TCSSValue>
concept Resolvable = requires {
  { TCSSValue::is_resolvable_value } -> std::convertible_to<bool>;
  requires TCSSValue::is_resolvable_value == true;
};

// Checks if a type is a discrete value
template <typename TCSSValue>
concept Discrete = requires {
  { TCSSValue::is_discrete_value } -> std::convertible_to<bool>;
  requires TCSSValue::is_discrete_value == true;
};

// Check if a type is derived from CSSValue
template <typename TCSSValue>
concept CSSValueDerived = std::is_base_of_v<CSSValue, TCSSValue>;

} // namespace reanimated::css
