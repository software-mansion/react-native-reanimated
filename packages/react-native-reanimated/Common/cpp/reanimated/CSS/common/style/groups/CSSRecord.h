#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/style/CSSValue.h>
#include <string_view>
#include <tuple>

namespace reanimated {

template <std::string_view Key, CSSValueDerived T>
struct Field {
  static constexpr std::string_view key = Key;
  using type = T;
};

template <typename... Fields>
  requires(CSSValueDerived<typename Fields::type> && ...)
class CSSRecord final : public CSSValue {
 public:
  CSSRecord(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isObject()) {
      throw std::runtime_error("Expected object value for CSSRecord");
    }
    auto object = value.asObject(rt);
    ((std::get<findFieldIndex<Fields::key>()>(values_) = typename Fields::type(
          rt, object.getProperty(rt, std::string(Fields::key)))),
     ...);
  }

  template <std::string_view Key>
  const auto &get() const {
    return std::get<findFieldIndex<Key>()>(values_);
  }

  jsi::Value toJSIValue(jsi::Runtime &rt) const override {
    auto object = jsi::Object(rt);
    ((object.setProperty(
         rt,
         std::string(Fields::key),
         std::get<findFieldIndex<Fields::key>()>(values_).toJSIValue(rt))),
     ...);
    return object;
  }

  folly::dynamic toDynamic() const override {
    folly::dynamic result = folly::dynamic::object;
    ((result[std::string(Fields::key)] =
          std::get<findFieldIndex<Fields::key>()>(values_).toDynamic()),
     ...);
    return result;
  }

  std::string toString() const override {
    std::string result = "{";
    bool first = true;
    (((first ? first = false : result += ", "),
      result += std::string(Fields::key) + ": " +
          std::get<findFieldIndex<Fields::key>()>(values_).toString()),
     ...);
    result += "}";
    return result;
  }

 private:
  std::tuple<typename Fields::type...> values_;

  template <std::string_view Key>
  static constexpr size_t findFieldIndex() {
    return findFieldIndexImpl<Key, 0, Fields...>();
  }

  template <std::string_view Key, size_t I, typename Field, typename... Rest>
  static constexpr size_t findFieldIndexImpl() {
    if constexpr (Field::key == Key) {
      return I;
    } else if constexpr (sizeof...(Rest) == 0) {
      static_assert(sizeof...(Rest) != 0, "Field key not found");
      return 0;
    } else {
      return findFieldIndexImpl<Key, I + 1, Rest...>();
    }
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
