#include <folly/json.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

namespace reanimated::css {

template <typename TDerived, typename TValue>
CSSNumberBase<TDerived, TValue>::CSSNumberBase() : value(0) {}

template <typename TDerived, typename TValue>
CSSNumberBase<TDerived, TValue>::CSSNumberBase(TValue value) : value(value) {}

template <typename TDerived, typename TValue>
CSSNumberBase<TDerived, TValue>::CSSNumberBase(
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

template <typename TDerived, typename TValue>
CSSNumberBase<TDerived, TValue>::CSSNumberBase(const folly::dynamic &value) {
  if (value.isInt() || value.isDouble()) {
    this->value = static_cast<TValue>(value.getDouble());
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSNumberBase: Invalid value type: " +
        folly::toJson(value));
  }
}

template <typename TDerived, typename TValue>
bool CSSNumberBase<TDerived, TValue>::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  return jsiValue.isNumber();
}

template <typename TDerived, typename TValue>
bool CSSNumberBase<TDerived, TValue>::canConstruct(
    const folly::dynamic &value) {
  return value.isInt() || value.isDouble();
}

template <typename TDerived, typename TValue>
folly::dynamic CSSNumberBase<TDerived, TValue>::toDynamic() const {
  return value;
}

template <typename TDerived, typename TValue>
std::string CSSNumberBase<TDerived, TValue>::toString() const {
  return std::to_string(value);
}

template <typename TDerived, typename TValue>
TDerived CSSNumberBase<TDerived, TValue>::interpolate(
    double progress,
    const TDerived &other) const {
  return TDerived(value + progress * (other.value - value));
}

template <typename TDerived, typename TValue>
bool CSSNumberBase<TDerived, TValue>::operator==(
    const CSSNumberBase<TDerived, TValue> &other) const {
  return value == other.value;
}

CSSInteger CSSInteger::interpolate(double progress, const CSSInteger &other)
    const {
  return CSSInteger(
      static_cast<int>(std::round(value + progress * (other.value - value))));
}

template struct CSSNumberBase<CSSDouble, double>;
template struct CSSNumberBase<CSSInteger, int>;

#ifdef ANDROID

CSSShadowRadiusAndroid::CSSShadowRadiusAndroid()
    : CSSNumberBase<CSSShadowRadiusAndroid, double>(1.0) {}

CSSShadowRadiusAndroid::CSSShadowRadiusAndroid(const double value)
    : CSSNumberBase<CSSShadowRadiusAndroid, double>(std::max(1.0, value)) {}

CSSShadowRadiusAndroid::CSSShadowRadiusAndroid(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue)
    : CSSNumberBase<CSSShadowRadiusAndroid, double>(rt, jsiValue) {
  value = std::max(1.0, value);
}

CSSShadowRadiusAndroid::CSSShadowRadiusAndroid(const folly::dynamic &value)
    : CSSNumberBase<CSSShadowRadiusAndroid, double>(value) {
  this->value = std::max(1.0, value.getDouble());
}

template struct CSSNumberBase<CSSShadowRadiusAndroid, double>;

#endif

} // namespace reanimated::css
