#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSKeyword.h>

namespace reanimated {

template <typename T>
CSSKeywordBase<T>::CSSKeywordBase() : value("") {}

template <typename T>
CSSKeywordBase<T>::CSSKeywordBase(const std::string &value) : value(value) {}

template <typename T>
CSSKeywordBase<T>::CSSKeywordBase(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  if (jsiValue.isString()) {
    value = jsiValue.getString(rt).utf8(rt);
  } else {
    throw std::invalid_argument(
        "[Reanimated] CSSKeywordBase: Invalid value type: " +
        stringifyJSIValue(rt, jsiValue));
  }
}

template <typename T>
bool CSSKeywordBase<T>::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  return jsiValue.isString();
}

template <typename T>
CSSValueType CSSKeywordBase<T>::type() const {
  return CSSValueType::Keyword;
}

template <typename T>
jsi::Value CSSKeywordBase<T>::toJSIValue(jsi::Runtime &rt) const {
  return jsi::String::createFromUtf8(rt, value);
}

template <typename T>
folly::dynamic CSSKeywordBase<T>::toDynamic() const {
  return value;
}

template <typename T>
std::string CSSKeywordBase<T>::toString() const {
  return value;
}

template <typename T>
bool CSSKeywordBase<T>::operator==(const CSSKeywordBase &other) const {
  return value == other.value;
}

CSSKeyword CSSKeyword::interpolate(double progress, const CSSKeyword &to)
    const {
  return CSSKeyword(progress < 0.5 ? value : to.value);
}

std::ostream &operator<<(std::ostream &os, const CSSKeyword &keywordValue) {
  os << "CSSKeyword(" << keywordValue.toString() << ")";
  return os;
}

CSSDisplay CSSDisplay::interpolate(double progress, const CSSDisplay &to)
    const {
  if (value == "none" && progress > 0) {
    return CSSDisplay(to.value);
  }
  if (to.value == "none" && progress < 1) {
    return CSSDisplay(value);
  }
  return CSSDisplay(progress < 0.5 ? value : to.value);
}

std::ostream &operator<<(std::ostream &os, const CSSDisplay &displayValue) {
  os << "CSSDisplay(" << displayValue.toString() << ")";
  return os;
}

// Explicit template instantiations
template class CSSKeywordBase<CSSKeyword>;
template class CSSKeywordBase<CSSDisplay>;

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
