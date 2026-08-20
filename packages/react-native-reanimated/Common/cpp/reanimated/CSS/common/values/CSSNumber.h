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

struct CSSDouble : public CSSNumberBase<CSSDouble, double> {
  // Inherit all constructors from the base class
  using CSSNumberBase::CSSNumberBase;
};

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

/// A number for text attributes (`fontSize`, `letterSpacing`, `lineHeight`).
///
/// React Native compares these with a 0.005 epsilon when deciding whether to
/// rebuild a paragraph's text state, but lays them out exactly, so a smaller
/// step moves the frame while the text keeps its old metrics and its trailing
/// word wraps out of view on Android. Interpolation lands on the endpoint once
/// it gets that close, keeping consecutive committed values distinguishable.
struct CSSTextDouble : public CSSNumberBase<CSSTextDouble, double> {
  // Inherit all constructors from the base class
  using CSSNumberBase::CSSNumberBase;

  CSSTextDouble interpolate(double progress, const CSSTextDouble &other) const override;
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
