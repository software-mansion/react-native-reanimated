#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSKeyword.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>
#include <vector>

namespace reanimated {

using namespace worklets;

template <typename TValue>
concept CSSValueDerived = std::is_base_of_v<CSSValue, TValue>;

/*
 * CSSDiscreteArray is used for array interpolation when arrays need to be
 * treated as discrete values. Instead of interpolating between corresponding
 * elements of two arrays, this type interpolates between entire arrays
 * treated as single discrete values.
 */
template <CSSValueDerived TValue>
struct CSSDiscreteArray
    : public CSSBaseValue<CSSValueType::Array, CSSDiscreteArray<TValue>> {
  static constexpr bool is_discrete_value = true;

  std::vector<TValue> values;

  CSSDiscreteArray();
  explicit CSSDiscreteArray(const std::vector<TValue> &values);
  explicit CSSDiscreteArray(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSDiscreteArray(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const override;
  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSDiscreteArray<TValue> interpolate(
      double progress,
      const CSSDiscreteArray<TValue> &other) const override;

  bool operator==(const CSSDiscreteArray<TValue> &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSDiscreteArray<TValue> &arrayValue);
#endif // NDEBUG
};

} // namespace reanimated

#endif
