#ifdef RCT_NEW_ARCH_ENABLED
#include <folly/json.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

namespace reanimated {

template <typename TValue, typename TDerived>
CSSNumberBase<TValue, TDerived>::CSSNumberBase() : value(0) {}

template <typename TValue, typename TDerived>
CSSNumberBase<TValue, TDerived>::CSSNumberBase(TValue value) : value(value) {}

template <typename TValue, typename TDerived>
CSSNumberBase<TValue, TDerived>::CSSNumberBase(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  if (jsiValue.isNumber()) {
    value = static_cast<TValue>(jsiValue.asNumber());
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSNumberBase: Invalid value type: " +
        stringifyJSIValue(rt, jsiValue));
  }
}

template <typename TValue, typename TDerived>
CSSNumberBase<TValue, TDerived>::CSSNumberBase(const folly::dynamic &value) {
  if (value.isInt() || value.isDouble()) {
    this->value = static_cast<TValue>(value.getDouble());
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSNumberBase: Invalid value type: " +
        folly::toJson(value));
  }
}

template <typename TValue, typename TDerived>
bool CSSNumberBase<TValue, TDerived>::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  return jsiValue.isNumber();
}

template <typename TValue, typename TDerived>
bool CSSNumberBase<TValue, TDerived>::canConstruct(
    const folly::dynamic &value) {
  return value.isInt() || value.isDouble();
}

template <typename TValue, typename TDerived>
folly::dynamic CSSNumberBase<TValue, TDerived>::toDynamic() const {
  return value;
}

template <typename TValue, typename TDerived>
std::string CSSNumberBase<TValue, TDerived>::toString() const {
  return std::to_string(value);
}

template <typename TValue, typename TDerived>
TDerived CSSNumberBase<TValue, TDerived>::interpolate(
    double progress,
    const TDerived &other) const {
  return TDerived(value + progress * (other.value - value));
}

template <typename TValue, typename TDerived>
bool CSSNumberBase<TValue, TDerived>::operator==(
    const CSSNumberBase<TValue, TDerived> &other) const {
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

CSSShadowRadiusAndroid::CSSShadowRadiusAndroid(const folly::dynamic &value)
    : CSSNumberBase<double, CSSShadowRadiusAndroid>(value) {
  this->value = std::max(1.0, value.getDouble());
}

template struct CSSNumberBase<double, CSSShadowRadiusAndroid>;

#endif

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
