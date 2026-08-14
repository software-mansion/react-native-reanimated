#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <string>
#include <type_traits>
#include <typeinfo>

namespace reanimated::css {

using namespace facebook;

// Held by reference only, which keeps UIManager and DOM out of every value
// type's include graph.
class ViewStylesRepository;

enum class RelativeTo : std::uint8_t {
  Parent,
  Self,
};

struct ValueInterpolationContext {
  const std::shared_ptr<const react::ShadowNode> &node;
  const double fallbackInterpolateThreshold;
};

/// Interpolating a value that is relative to a view - e.g. a percentage
/// length against its parent - needs the view's styles as well as the node.
struct RelativeValueInterpolationContext {
  const std::shared_ptr<const react::ShadowNode> &node;
  const double fallbackInterpolateThreshold;
  const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
  const std::string &relativeProperty;
  const RelativeTo relativeTo;
};

struct CSSValue {
  // This field should be overridden in discrete value types
  static constexpr bool is_discrete_value = false;

  virtual ~CSSValue() = default;

  virtual bool operator==(const CSSValue &other) const = 0;

  virtual folly::dynamic toDynamic() const = 0;
  virtual std::string toString() const = 0;
};

// Base for leaf values that can be interpolated without resolution
template <typename TDerived>
struct CSSSimpleValue : public CSSValue {
  static constexpr bool is_resolvable_value = false;

  bool operator==(const CSSValue &other) const override {
    return typeid(*this) == typeid(other) &&
        *static_cast<const TDerived *>(this) == static_cast<const TDerived &>(other);
  }

  virtual TDerived interpolate(double progress, const TDerived &to) const = 0;
  virtual bool canInterpolateTo(const TDerived &to) const {
    return true;
  }
};

// Base for leaf values that need resolution before interpolation
template <typename TDerived, typename TContext>
struct CSSResolvableValue : public CSSValue {
  static constexpr bool is_resolvable_value = true;
  using ContextType = TContext;

  bool operator==(const CSSValue &other) const override {
    return typeid(*this) == typeid(other) &&
        *static_cast<const TDerived *>(this) == static_cast<const TDerived &>(other);
  }

  virtual TDerived interpolate(double progress, const TDerived &to, const TContext &context) const = 0;
  virtual bool canInterpolateTo(const TDerived &to) const {
    return true;
  }
};

// Checks if a type is a resolvable value that needs resolution before
// interpolation
template <typename TCSSValue>
concept Resolvable = requires {
  { TCSSValue::is_resolvable_value } -> std::convertible_to<bool>;
  requires TCSSValue::is_resolvable_value == true;
};

/// The context needed to interpolate these types together: the one declared by
/// the resolvable alternative, wherever it sits in the list, or the plain
/// context when none of them resolve.
template <typename... TCSSValues>
struct InterpolationContext {
  using Type = ValueInterpolationContext;
};

template <typename TCSSValue, typename... TRest>
struct InterpolationContext<TCSSValue, TRest...> {
  using Type = typename InterpolationContext<TRest...>::Type;
};

template <Resolvable TCSSValue, typename... TRest>
struct InterpolationContext<TCSSValue, TRest...> {
  using Type = typename TCSSValue::ContextType;
};

template <typename... TCSSValues>
using InterpolationContextFor = typename InterpolationContext<TCSSValues...>::Type;

/// Values that need no context at all satisfy this trivially.
template <typename TCSSValue, typename TContext>
concept InterpolatesWith = !Resolvable<TCSSValue> || std::is_same_v<typename TCSSValue::ContextType, TContext>;

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
