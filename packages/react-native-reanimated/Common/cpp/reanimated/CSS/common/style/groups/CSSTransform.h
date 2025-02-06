#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/style/CSSValue.h>
#include <reanimated/CSS/common/style/groups/CSSRecord.h>

namespace reanimated {

template <typename... TransformOps>
class CSSTransform final : public CSSValue {
 private:
  static const std::unordered_set<std::string_view> transformSet;

 public:
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isObject()) {
      return false;
    }

    auto obj = value.asObject(rt);
    auto names = obj.getPropertyNames(rt);
    if (names.size(rt) != 1) {
      return false;
    }

    auto name = names.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
    return transformSet.contains(name);
  }

  CSSTransform(jsi::Runtime &rt, const jsi::Value &value) {
    auto obj = value.asObject(rt);
    auto name =
        obj.getPropertyNames(rt).getValueAtIndex(rt, 0).asString(rt).utf8(rt);
    auto val = obj.getProperty(rt, name.c_str());
    transform_ = constructors.at(name)(rt, val);
  }

  jsi::Value toJSIValue(jsi::Runtime &rt) const override {
    return transform_.toJSIValue(rt);
  }

  folly::dynamic toDynamic() const override {
    return transform_.toDynamic();
  }

  std::string toString() const override {
    return transform_.toString();
  }

 private:
  std::variant<TransformOps...> transform_;
  static const std::unordered_map<
      std::string_view,
      std::function<
          std::variant<TransformOps...>(jsi::Runtime &, const jsi::Value &)>>
      constructors;
};

template <typename... TransformOps>
const std::unordered_set<std::string_view>
    CSSTransform<TransformOps...>::transformSet = {TransformOps::key...};

template <std::string_view Name, typename T>
using TransformOp = CSSRecord<Field<Name, T>>;

template <typename... TransformOps>
const std::unordered_map<
    std::string_view,
    std::function<
        std::variant<TransformOps...>(jsi::Runtime &, const jsi::Value &)>>
    CSSTransform<TransformOps...>::constructors = {
        {TransformOps::key, [](jsi::Runtime &rt, const jsi::Value &val) {
           return TransformOps(rt, val);
         }}...};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
