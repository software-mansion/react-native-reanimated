#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/common/values/CSSNumber.h>

namespace reanimated {

template <typename T>
CSSNumberBase<T>::CSSNumberBase() : value(0) {}

template <typename T>
CSSNumberBase<T>::CSSNumberBase(T value) : value(value) {}

template <typename T>
CSSNumberBase<T>::CSSNumberBase(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (jsiValue.isNumber()) {
    value = static_cast<T>(jsiValue.asNumber());
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSNumberBase: Invalid value type: " +
        stringifyJSIValue(rt, jsiValue));
  }
}

template <typename T>
bool CSSNumberBase<T>::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  return jsiValue.isNumber();
}

template <typename T>
jsi::Value CSSNumberBase<T>::toJSIValue(jsi::Runtime &rt) const {
  return jsi::Value(static_cast<double>(value));
}

template <typename T>
folly::dynamic CSSNumberBase<T>::toDynamic() const {
  return value;
}

template <typename T>
std::string CSSNumberBase<T>::toString() const {
  return std::to_string(value);
}

template <typename T>
CSSNumberBase<T> CSSNumberBase<T>::interpolate(
    double progress,
    const CSSNumberBase<T> &other) const {
  if constexpr (std::is_integral_v<T>) {
    return CSSNumberBase<T>(
        static_cast<T>(std::round(value + progress * (other.value - value))));
  } else {
    return CSSNumberBase<T>(value + progress * (other.value - value));
  }
}

template <typename T>
bool CSSNumberBase<T>::operator==(const CSSNumberBase<T> &other) const {
  return value == other.value;
}

template <typename T>
std::ostream &operator<<(
    std::ostream &os,
    const CSSNumberBase<T> &numberValue) {
  os << "CSSNumberBase(" << numberValue.toString() << ")";
  return os;
}

template struct CSSNumberBase<double>;
template struct CSSNumberBase<int>;

template std::ostream &operator<<(
    std::ostream &,
    const CSSNumberBase<double> &);
template std::ostream &operator<<(std::ostream &, const CSSNumberBase<int> &);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
