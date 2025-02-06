#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/style/CSSValue.h>
#include <array>
#include <functional>
#include <memory>
#include <string_view>
#include <tuple>
#include <unordered_map>

namespace reanimated {

template <typename Key, size_t N, CSSValueDerived T>
struct Field {
  static constexpr std::array<char, N> key{};
  static constexpr std::string_view keyView{
      key.data(),
      N - 1}; // -1 to exclude null terminator
  using type = T;
};

template <typename... Fields>
class CSSRecord final : public CSSValue {
 private:
  std::unordered_map<std::string_view, std::unique_ptr<CSSValue>> values_;

  static const std::unordered_map<
      std::string_view,
      std::function<
          std::unique_ptr<CSSValue>(jsi::Runtime &, const jsi::Value &)>>
      constructors;

 public:
  CSSRecord(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isObject()) {
      throw std::runtime_error(
          "[Reanimated] Expected object value for CSSRecord");
    }

    auto object = value.asObject(rt);
    auto propertyNames = object.getPropertyNames(rt);

    for (size_t i = 0; i < propertyNames.length(rt); i++) {
      auto propName = propertyNames.getValueAtIndex(rt, i).getString(rt);
      auto propValue = object.getProperty(rt, propName.utf8(rt).c_str());

      if (auto constructor = constructors.find(propName.utf8(rt));
          constructor != constructors.end()) {
        values_[propName.utf8(rt)] = constructor->second(rt, propValue);
      }
    }
  }

  template <typename Key, size_t N>
  const auto &get() const {
    static constexpr std::string_view key{Key::key.data(), N - 1};
    if (auto it = values_.find(key); it != values_.end()) {
      using FieldType = typename std::tuple_element_t<
          0,
          std::tuple<std::conditional_t<
              std::is_same_v<Key, typename Fields::key_type>,
              Fields,
              void>...>>;
      return *static_cast<const typename FieldType::type *>(it->second.get());
    }
    throw std::runtime_error(
        "[Reanimated] Attempted to access non-existent field in CSSRecord");
  }

  jsi::Value toJSIValue(jsi::Runtime &rt) const override {
    auto object = jsi::Object(rt);
    for (const auto &[key, value] : values_) {
      object.setProperty(rt, std::string(key), value->toJSIValue(rt));
    }
    return object;
  }

  folly::dynamic toDynamic() const override {
    folly::dynamic result = folly::dynamic::object;
    for (const auto &[key, value] : values_) {
      result[std::string(key)] = value->toDynamic();
    }
    return result;
  }

  std::string toString() const override {
    std::ostringstream oss;
    oss << '{';
    bool first = true;
    for (const auto &[key, value] : values_) {
      if (!first) {
        oss << ", ";
      }
      first = false;
      oss << std::string(key) << ": " << value->toString();
    }
    oss << '}';
    return oss.str();
  }
};

// Initialize the constructors map
template <typename... Fields>
const std::unordered_map<
    std::string_view,
    std::function<
        std::unique_ptr<CSSValue>(jsi::Runtime &, const jsi::Value &)>>
    CSSRecord<Fields...>::constructors = {
        {Fields::key, [](jsi::Runtime &rt, const jsi::Value &val) {
           return std::make_unique<typename Fields::type>(rt, val);
         }}...};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
