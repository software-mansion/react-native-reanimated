#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>

namespace reanimated {

using namespace worklets;

template <typename T>
struct CSSNumberBase
    : public CSSBaseValue<CSSValueType::Number, CSSNumberBase<T>> {
  T value;

  CSSNumberBase();
  explicit CSSNumberBase(T value);
  explicit CSSNumberBase(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  folly::dynamic toDynamic() const;
  std::string toString() const;
  CSSNumberBase<T> interpolate(double progress, const CSSNumberBase<T> &other)
      const;

  bool operator==(const CSSNumberBase<T> &other) const;
  template <typename U>
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSNumberBase<U> &numberValue);
};

using CSSDouble = CSSNumberBase<double>;
using CSSInteger = CSSNumberBase<int>;

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
