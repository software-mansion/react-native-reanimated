#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>

#include <string>

namespace reanimated::css {

template <typename TDerived, typename TValue>
struct CSSNumberBase : public CSSSimpleValue<TDerived> {
  TValue value;

  CSSNumberBase();
  explicit CSSNumberBase(TValue value);
  explicit CSSNumberBase(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSNumberBase(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  TDerived interpolate(double progress, const TDerived &other) const override;

  bool operator==(const CSSNumberBase<TDerived, TValue> &other) const;
};

#ifndef NDEBUG

template <typename TDerived, typename TValue>
std::ostream &operator<<(std::ostream &os, const CSSNumberBase<TDerived, TValue> &numberValue) {
  os << "CSSNumberBase(" << numberValue.toString() << ")";
  return os;
}

#endif // NDEBUG

/// Interpolate exactly - `CSSDoubleBase` compiles its epsilon check away.
struct CSSExactPrecision {
  static constexpr double epsilon = 0;
};

/// React Native compares text attributes with `floatEquality`, whose epsilon is
/// 0.005, when deciding whether to rebuild a paragraph's text state, but lays
/// them out exactly. Below that epsilon the frame moves to the new metrics
/// while the text keeps the old ones, and on Android the trailing word wraps
/// out of view.
/// https://github.com/facebook/react-native/blob/v0.87.0/packages/react-native/ReactCommon/react/renderer/attributedstring/TextAttributes.cpp#L174-L177
struct CSSTextPrecision {
  static constexpr double epsilon = 0.005;
};

/// A double that stops short of `TPrecision::epsilon` from the endpoint and
/// lands on it instead. Emitting a value the platform cannot tell apart from
/// the endpoint makes the final, exact value read as no change at all.
///
/// A precision tag rather than a `double` template argument because floating
/// point non-type template parameters are not supported by the NDK's compiler.
template <typename TPrecision>
struct CSSDoubleBase : public CSSNumberBase<CSSDoubleBase<TPrecision>, double> {
  // Inherit all constructors from the base class
  using CSSNumberBase<CSSDoubleBase<TPrecision>, double>::CSSNumberBase;

  CSSDoubleBase interpolate(double progress, const CSSDoubleBase &other) const override;
};

using CSSDouble = CSSDoubleBase<CSSExactPrecision>;
using CSSTextDouble = CSSDoubleBase<CSSTextPrecision>;

struct CSSInteger : public CSSNumberBase<CSSInteger, int> {
  // Inherit all constructors from the base class
  using CSSNumberBase::CSSNumberBase;

  CSSInteger interpolate(double progress, const CSSInteger &other) const override;
};

struct CSSIndex : public CSSNumberBase<CSSIndex, int> {
  // Inherit all constructors from the base class
  using CSSNumberBase::CSSNumberBase;

  CSSIndex interpolate(double progress, const CSSIndex &other) const override;
};

#ifdef ANDROID

// For some reason Android crashes when blurRadius is smaller than 1 so we use a
// custom value that will never be smaller than 1

struct CSSShadowRadiusAndroid : public CSSNumberBase<CSSShadowRadiusAndroid, double> {
  CSSShadowRadiusAndroid();
  explicit CSSShadowRadiusAndroid(double value);
  explicit CSSShadowRadiusAndroid(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSShadowRadiusAndroid(const folly::dynamic &value);
};

#endif

} // namespace reanimated::css
