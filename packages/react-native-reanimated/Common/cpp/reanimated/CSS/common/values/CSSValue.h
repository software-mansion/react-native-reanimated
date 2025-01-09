#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <string>
#include <type_traits>

namespace reanimated {

using namespace facebook;

enum class CSSValueType {
  Angle,
  Boolean,
  Color,
  Keyword,
  Dimension,
  Number,
  TransformOrigin,
  Empty
};

enum class RelativeTo {
  Parent,
  Self,
};

struct CSSResolvableValueInterpolationContext {
  const ShadowNode::Shared &node;
  const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
  const std::string &relativeProperty;
  const RelativeTo relativeTo;
};

struct CSSValue {
  virtual ~CSSValue() = default;

  virtual CSSValueType type() const = 0;

  virtual jsi::Value toJSIValue(jsi::Runtime &rt) const = 0;
  virtual folly::dynamic toDynamic() const = 0;
  virtual std::string toString() const = 0;
};

template <CSSValueType Type, typename T>
struct CSSBaseValue : public CSSValue {
  static constexpr bool is_resolvable_value = false;
  static constexpr bool is_discrete_value = false;

  CSSValueType type() const override {
    return Type;
  }

  virtual T interpolate(double progress, const T &to) const = 0;
};

template <CSSValueType Type, typename T, typename U = T>
struct CSSResolvableValue : public CSSValue {
  static constexpr bool is_resolvable_value = true;
  static constexpr bool is_discrete_value = false;

  CSSValueType type() const override {
    return Type;
  }

  virtual T interpolate(
      double progress,
      const T &to,
      const CSSResolvableValueInterpolationContext &context) const = 0;
  virtual std::optional<U> resolve(
      const CSSResolvableValueInterpolationContext &context) const = 0;
};

inline bool isDiscrete(const CSSValue &value) {
  return value.type() == CSSValueType::Keyword;
}

template <typename T>
concept Resolvable = requires {
  { T::is_resolvable_value } -> std::convertible_to<bool>;
  requires T::is_resolvable_value == true;
};

template <typename T>
concept Discrete = requires {
  { T::is_discrete_value } -> std::convertible_to<bool>;
  requires T::is_discrete_value == true;
};

} // namespace reanimated

#endif
