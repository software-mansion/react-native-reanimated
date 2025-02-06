#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/style/CSSValue.h>
#include <tuple>

namespace reanimated {

template <CSSValueDerived... Types>
class CSSTuple final : public CSSValue {
 public:
  CSSTuple(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isArray()) {
      throw std::runtime_error("Expected array value for CSSTuple");
    }
    auto array = value.asObject(rt).asArray(rt);
    if (array.size(rt) != sizeof...(Types)) {
      throw std::runtime_error("Array size mismatch");
    }

    constructElements(rt, array, std::make_index_sequence<sizeof...(Types)>{});
  }

  template <size_t I>
  const auto &get() const {
    return std::get<I>(values_);
  }

  jsi::Value toJSIValue(jsi::Runtime &rt) const override {
    auto array = jsi::Array(rt, sizeof...(Types));
    ((array.setValueAtIndex(rt, I, std::get<I>(values_).toJSIValue(rt))), ...);
    return array;
  }

  folly::dynamic toDynamic() const override {
    folly::dynamic result = folly::dynamic::array;
    (result.push_back(std::get<I>(values_).toDynamic()), ...);
    return result;
  }

  std::string toString() const override {
    std::string result = "[";
    bool first = true;
    (((first ? first = false : result += ", "),
      result += std::get<I>(values_).toString()),
     ...);
    result += "]";
    return result;
  }

 private:
  std::tuple<Types...> values_;

  template <size_t... I>
  void constructElements(
      jsi::Runtime &rt,
      const jsi::Array &array,
      std::index_sequence<I...>) {
    ((std::get<I>(values_) = std::tuple_element_t<I, std::tuple<Types...>>(
          rt, array.getValueAtIndex(rt, I))),
     ...);
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
