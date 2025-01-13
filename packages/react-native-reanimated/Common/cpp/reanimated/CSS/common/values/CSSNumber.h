#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <algorithm>
#include <string>

namespace reanimated {

using namespace worklets;

template <typename T, typename Derived>
struct CSSNumberBase : public CSSBaseValue<CSSValueType::Number, Derived> {
  T value;

  CSSNumberBase();
  explicit CSSNumberBase(T value);
  explicit CSSNumberBase(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  folly::dynamic toDynamic() const;
  std::string toString() const;
  Derived interpolate(double progress, const Derived &other) const;

  bool operator==(const CSSNumberBase<T, Derived> &other) const;
};

template <typename T, typename Derived>
std::ostream &operator<<(
    std::ostream &os,
    const CSSNumberBase<T, Derived> &numberValue) {
  os << "CSSNumberBase(" << numberValue.toString() << ")";
  return os;
}

struct CSSDouble : public CSSNumberBase<double, CSSDouble> {
  // Inherit all constructors from the base class
  using CSSNumberBase::CSSNumberBase;
};
struct CSSInteger : public CSSNumberBase<int, CSSInteger> {
  // Inherit all constructors from the base class
  using CSSNumberBase::CSSNumberBase;

  CSSInteger interpolate(double progress, const CSSInteger &other)
      const override;
};

#ifdef ANDROID

// For some reason Android crashes when blurRadius is smaller than 1 so we use a
// custom value that will never be smaller than 1

struct CSSShadowRadiusAndroid
    : public CSSNumberBase<double, CSSShadowRadiusAndroid> {
  CSSShadowRadiusAndroid();
  explicit CSSShadowRadiusAndroid(double value);
  explicit CSSShadowRadiusAndroid(jsi::Runtime &rt, const jsi::Value &jsiValue);
};

#endif

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
