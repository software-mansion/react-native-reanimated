#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/common/values/CSSNumber.h>

namespace reanimated {

template <typename T, typename Derived>
CSSNumberBase<T, Derived>::CSSNumberBase() : value(0) {}

template <typename T, typename Derived>
CSSNumberBase<T, Derived>::CSSNumberBase(T value) : value(value) {}

template <typename T, typename Derived>
CSSNumberBase<T, Derived>::CSSNumberBase(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  if (jsiValue.isNumber()) {
    value = static_cast<T>(jsiValue.asNumber());
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSNumberBase: Invalid value type: " +
        stringifyJSIValue(rt, jsiValue));
  }
}

template <typename T, typename Derived>
bool CSSNumberBase<T, Derived>::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  return jsiValue.isNumber();
}

template <typename T, typename Derived>
jsi::Value CSSNumberBase<T, Derived>::toJSIValue(jsi::Runtime &rt) const {
  return jsi::Value(static_cast<double>(value));
}

template <typename T, typename Derived>
folly::dynamic CSSNumberBase<T, Derived>::toDynamic() const {
  return value;
}

template <typename T, typename Derived>
std::string CSSNumberBase<T, Derived>::toString() const {
  return std::to_string(value);
}

template <typename T, typename Derived>
Derived CSSNumberBase<T, Derived>::interpolate(
    double progress,
    const Derived &other) const {
  return Derived(value + progress * (other.value - value));
}

template <typename T, typename Derived>
bool CSSNumberBase<T, Derived>::operator==(
    const CSSNumberBase<T, Derived> &other) const {
  return value == other.value;
}

CSSInteger CSSInteger::interpolate(double progress, const CSSInteger &other)
    const {
  return CSSInteger(
      static_cast<int>(std::round(value + progress * (other.value - value))));
}

template struct CSSNumberBase<double, CSSDouble>;
template struct CSSNumberBase<int, CSSInteger>;

#ifdef ANDROID

CSSShadowRadiusAndroid::CSSShadowRadiusAndroid()
    : CSSNumberBase<double, CSSShadowRadiusAndroid>(1.0) {}

CSSShadowRadiusAndroid::CSSShadowRadiusAndroid(const double value)
    : CSSNumberBase<double, CSSShadowRadiusAndroid>(std::max(1.0, value)) {}

CSSShadowRadiusAndroid::CSSShadowRadiusAndroid(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue)
    : CSSNumberBase<double, CSSShadowRadiusAndroid>(rt, jsiValue) {
  value = std::max(1.0, value);
}

template struct CSSNumberBase<double, CSSShadowRadiusAndroid>;

#endif

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
