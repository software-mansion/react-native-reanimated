#pragma once

#include <reanimated/CSS/common/values/CSSKeyword.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>
#include <vector>

namespace reanimated::css {

using namespace worklets;

/*
 * CSSDiscreteArray is used for array interpolation when arrays need to be
 * treated as discrete values. Instead of interpolating between corresponding
 * elements of two arrays, this type interpolates between entire arrays
 * treated as single discrete values.
 */
template <CSSValueDerived TValue>
struct CSSDiscreteArray : public CSSSimpleValue<CSSDiscreteArray<TValue>> {
  static constexpr bool is_discrete_value = true;

  std::vector<TValue> values;

  CSSDiscreteArray();
  explicit CSSDiscreteArray(const std::vector<TValue> &values);
  explicit CSSDiscreteArray(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSDiscreteArray(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

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

} // namespace reanimated::css
