#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSKeyword.h>

namespace reanimated {

template <typename TValue>
CSSKeywordBase<TValue>::CSSKeywordBase() : value("") {}

template <typename TValue>
CSSKeywordBase<TValue>::CSSKeywordBase(const std::string &value)
    : value(value) {}

template <typename TValue>
CSSKeywordBase<TValue>::CSSKeywordBase(
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

template <typename TValue>
bool CSSKeywordBase<TValue>::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  return jsiValue.isString();
}

template <typename TValue>
CSSValueType CSSKeywordBase<TValue>::type() const {
  return CSSValueType::Keyword;
}

template <typename TValue>
jsi::Value CSSKeywordBase<TValue>::toJSIValue(jsi::Runtime &rt) const {
  return jsi::String::createFromUtf8(rt, value);
}

template <typename TValue>
folly::dynamic CSSKeywordBase<TValue>::toDynamic() const {
  return value;
}

template <typename TValue>
std::string CSSKeywordBase<TValue>::toString() const {
  return value;
}

template <typename TValue>
bool CSSKeywordBase<TValue>::operator==(
    const CSSKeywordBase<TValue> &other) const {
  return value == other.value;
}

CSSKeyword CSSKeyword::interpolate(double progress, const CSSKeyword &to)
    const {
  return CSSKeyword(progress < 0.5 ? value : to.value);
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSKeyword &keywordValue) {
  os << "CSSKeyword(" << keywordValue.toString() << ")";
  return os;
}

#endif // NDEBUG

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

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSDisplay &displayValue) {
  os << "CSSDisplay(" << displayValue.toString() << ")";
  return os;
}

#endif // NDEBUG

// Explicit template instantiations
template class CSSKeywordBase<CSSKeyword>;
template class CSSKeywordBase<CSSDisplay>;

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
