#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSKeyword.h>

#include <worklets/Tools/JSISerializer.h>

namespace reanimated {

using namespace worklets;

template <typename T>
concept CSSValueDerived = std::is_base_of_v<CSSValue, T>;

/*
 * CSSDiscreteArray is used for array interpolation when arrays need to be
 * treated as discrete values. Instead of interpolating between corresponding
 * elements of two arrays, this type interpolates between entire arrays
 * treated as single discrete values.
 */
template <CSSValueDerived T>
struct CSSDiscreteArray
    : public CSSBaseValue<CSSValueType::Array, CSSDiscreteArray<T>> {
  static constexpr bool is_discrete_value = true;

  std::vector<T> values;

  CSSDiscreteArray();
  explicit CSSDiscreteArray(const std::vector<T> &values);
  explicit CSSDiscreteArray(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  jsi::Value toJSIValue(jsi::Runtime &rt) const override;
  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSDiscreteArray<T> interpolate(
      double progress,
      const CSSDiscreteArray<T> &other) const override;

  bool operator==(const CSSDiscreteArray<T> &other) const;
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSDiscreteArray &arrayValue);
};

} // namespace reanimated

#endif
