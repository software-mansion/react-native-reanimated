#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/style/CSSValue.h>
#include <sstream>
#include <tuple>

namespace reanimated {

template <CSSValueDerived... Types>
class CSSTuple final : public CSSValue {
 public:
  CSSTuple() = default;

  CSSTuple(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isObject() || !value.asObject(rt).isArray(rt)) {
      throw std::runtime_error(
          "[Reanimated] CSSTuple: Expected array value but received different type");
    }
    auto array = value.asObject(rt).asArray(rt);
    if (array.size(rt) != sizeof...(Types)) {
      throw std::runtime_error(
          "[Reanimated] CSSTuple: Expected array of size " +
          std::to_string(sizeof...(Types)) + " but got " +
          std::to_string(array.size(rt)));
    }

    constructElements(rt, array, std::make_index_sequence<sizeof...(Types)>{});
  }

  template <size_t I>
  void set(const std::tuple_element_t<I, std::tuple<Types...>> &value) {
    checkBounds<I>();
    std::get<I>(values_) = value;
  }

  template <size_t I>
  const auto &get() const {
    checkBounds<I>();
    return std::get<I>(values_);
  }

  jsi::Value toJSIValue(jsi::Runtime &rt) const override {
    return toJSIValueImpl(rt, std::make_index_sequence<sizeof...(Types)>{});
  }

  folly::dynamic toDynamic() const override {
    return toDynamicImpl(std::make_index_sequence<sizeof...(Types)>{});
  }

  std::string toString() const override {
    return toStringImpl(std::make_index_sequence<sizeof...(Types)>{});
  }

 private:
  std::tuple<Types...> values_;

  template <size_t I>
  static constexpr void checkBounds() {
    static_assert(
        I < sizeof...(Types),
        "[Reanimated] CSSTuple: Index out of bounds. Attempted to access index "
        "beyond tuple size");
  }

  template <size_t... I>
  void constructElements(
      jsi::Runtime &rt,
      const jsi::Array &array,
      std::index_sequence<I...>) {
    ((std::get<I>(values_) = std::tuple_element_t<I, std::tuple<Types...>>(
          rt, array.getValueAtIndex(rt, I))),
     ...);
  }

  template <size_t... I>
  jsi::Value toJSIValueImpl(jsi::Runtime &rt, std::index_sequence<I...>) const {
    auto array = jsi::Array(rt, sizeof...(Types));
    ((array.setValueAtIndex(rt, I, std::get<I>(values_).toJSIValue(rt))), ...);
    return array;
  }

  template <size_t... I>
  folly::dynamic toDynamicImpl(std::index_sequence<I...>) const {
    folly::dynamic result = folly::dynamic::array;
    (result.push_back(std::get<I>(values_).toDynamic()), ...);
    return result;
  }

  template <size_t... I>
  std::string toStringImpl(std::index_sequence<I...>) const {
    std::ostringstream oss;
    oss << "[";
    bool first = true;
    ((first ? first = false : oss << ", ",
      oss << std::get<I>(values_).toString()),
     ...);
    oss << "]";
    return oss.str();
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
