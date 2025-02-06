#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/style/CSSValue.h>
#include <vector>

namespace reanimated {

template <CSSValueDerived T>
class CSSArray final : public CSSValue {
 public:
  CSSArray(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isArray()) {
      throw std::runtime_error("Expected array value for CSSArray");
    }
    auto array = value.asObject(rt).asArray(rt);
    values_.reserve(array.size(rt));

    for (size_t i = 0; i < array.size(rt); i++) {
      values_.emplace_back(T(rt, array.getValueAtIndex(rt, i)));
    }
  }

  // Array access operators
  const T &operator[](size_t index) const {
    return values_[index];
  }

  T &operator[](size_t index) {
    return values_[index];
  }

  // Size accessor
  size_t size() const {
    return values_.size();
  }

  // Iterator support
  auto begin() {
    return values_.begin();
  }
  auto end() {
    return values_.end();
  }
  auto begin() const {
    return values_.begin();
  }
  auto end() const {
    return values_.end();
  }

  // Required CSSValue interface implementations
  jsi::Value toJSIValue(jsi::Runtime &rt) const override {
    auto array = jsi::Array(rt, values_.size());
    for (size_t i = 0; i < values_.size(); i++) {
      array.setValueAtIndex(rt, i, values_[i].toJSIValue(rt));
    }
    return array;
  }

  folly::dynamic toDynamic() const override {
    folly::dynamic result = folly::dynamic::array;
    for (const auto &value : values_) {
      result.push_back(value.toDynamic());
    }
    return result;
  }

  std::string toString() const override {
    std::string result = "[";
    for (size_t i = 0; i < values_.size(); i++) {
      if (i > 0) {
        result += ", ";
      }
      result += values_[i].toString();
    }
    result += "]";
    return result;
  }

 private:
  std::vector<T> values_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
