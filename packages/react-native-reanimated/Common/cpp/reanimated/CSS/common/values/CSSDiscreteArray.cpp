#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSDiscreteArray.h>

namespace reanimated {

template <CSSValueDerived TValue>
CSSDiscreteArray<TValue>::CSSDiscreteArray() : values() {}

template <CSSValueDerived TValue>
CSSDiscreteArray<TValue>::CSSDiscreteArray(const std::vector<TValue> &values)
    : values(values) {}

template <CSSValueDerived TValue>
CSSDiscreteArray<TValue>::CSSDiscreteArray(
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

template <CSSValueDerived TValue>
bool CSSDiscreteArray<TValue>::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  // TODO - maybe add better validation
  return jsiValue.isObject() && jsiValue.asObject(rt).isArray(rt);
}

template <CSSValueDerived TValue>
jsi::Value CSSDiscreteArray<TValue>::toJSIValue(jsi::Runtime &rt) const {
  jsi::Array array(rt, values.size());
  for (size_t i = 0; i < values.size(); i++) {
    array.setValueAtIndex(rt, i, values[i].toJSIValue(rt));
  }
  return array;
}

template <CSSValueDerived TValue>
folly::dynamic CSSDiscreteArray<TValue>::toDynamic() const {
  folly::dynamic array = folly::dynamic::array;
  for (const auto &value : values) {
    array.push_back(value.toDynamic());
  }
  return array;
}

template <CSSValueDerived TValue>
std::string CSSDiscreteArray<TValue>::toString() const {
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

template <CSSValueDerived TValue>
CSSDiscreteArray<TValue> CSSDiscreteArray<TValue>::interpolate(
    double progress,
    const CSSDiscreteArray<TValue> &other) const {
  return CSSDiscreteArray<TValue>(progress < 0.5 ? values : other.values);
}

template <CSSValueDerived TValue>
bool CSSDiscreteArray<TValue>::operator==(
    const CSSDiscreteArray<TValue> &other) const {
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

#ifndef NDEBUG

template <CSSValueDerived TValue>
std::ostream &operator<<(
    std::ostream &os,
    const CSSDiscreteArray<TValue> &arrayValue) {
  os << "CSSDiscreteArray(" << arrayValue.toString() << ")";
  return os;
}

#endif // NDEBUG

template struct CSSDiscreteArray<CSSKeyword>;

} // namespace reanimated

#endif
