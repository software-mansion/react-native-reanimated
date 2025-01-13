#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSDiscreteArray.h>

namespace reanimated {

template <CSSValueDerived T>
CSSDiscreteArray<T>::CSSDiscreteArray() : values() {}

template <CSSValueDerived T>
CSSDiscreteArray<T>::CSSDiscreteArray(const std::vector<T> &values)
    : values(values) {}

template <CSSValueDerived T>
CSSDiscreteArray<T>::CSSDiscreteArray(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  if (!canConstruct(rt, jsiValue)) {
    throw std::invalid_argument(
        "[Reanimated] CSSDiscreteArray: Invalid value type: " +
        stringifyJSIValue(rt, jsiValue));
  }

  const auto &array = jsiValue.asObject(rt).asArray(rt);
  values.reserve(array.size(rt));

  for (size_t i = 0; i < array.size(rt); i++) {
    values.emplace_back(rt, array.getValueAtIndex(rt, i));
  }
}

template <CSSValueDerived T>
bool CSSDiscreteArray<T>::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  // TODO - maybe add better validation
  return jsiValue.isObject() && jsiValue.asObject(rt).isArray(rt);
}

template <CSSValueDerived T>
jsi::Value CSSDiscreteArray<T>::toJSIValue(jsi::Runtime &rt) const {
  jsi::Array array(rt, values.size());
  for (size_t i = 0; i < values.size(); i++) {
    array.setValueAtIndex(rt, i, values[i].toJSIValue(rt));
  }
  return array;
}

template <CSSValueDerived T>
folly::dynamic CSSDiscreteArray<T>::toDynamic() const {
  folly::dynamic array = folly::dynamic::array;
  for (const auto &value : values) {
    array.push_back(value.toDynamic());
  }
  return array;
}

template <CSSValueDerived T>
std::string CSSDiscreteArray<T>::toString() const {
  std::stringstream ss;

  ss << "{";
  for (size_t i = 0; i < values.size(); i++) {
    ss << values[i].toString();
    if (i < values.size() - 1) {
      ss << ", ";
    }
  }
  ss << "}";

  return ss.str();
}

template <CSSValueDerived T>
CSSDiscreteArray<T> CSSDiscreteArray<T>::interpolate(
    double progress,
    const CSSDiscreteArray<T> &other) const {
  return CSSDiscreteArray<T>(progress < 0.5 ? values : other.values);
}

template <CSSValueDerived T>
bool CSSDiscreteArray<T>::operator==(const CSSDiscreteArray<T> &other) const {
  if (values.size() != other.values.size()) {
    return false;
  }
  for (size_t i = 0; i < values.size(); i++) {
    if (values[i] != other.values[i]) {
      return false;
    }
  }
  return true;
}

template <CSSValueDerived T>
std::ostream &operator<<(
    std::ostream &os,
    const CSSDiscreteArray<T> &arrayValue) {
  os << "CSSDiscreteArray(" << arrayValue.toString() << ")";
  return os;
}

template struct CSSDiscreteArray<CSSKeyword>;

} // namespace reanimated

#endif
