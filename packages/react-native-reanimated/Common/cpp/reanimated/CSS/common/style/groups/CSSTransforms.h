#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/style/groups/CSSRecord.h>
#include <reanimated/CSS/common/style/values/CSSAngle.h>
#include <reanimated/CSS/common/style/values/CSSDimension.h>
#include <reanimated/CSS/common/style/values/CSSNumber.h>
#include <reanimated/CSS/common/style/values/CSSValue.h>

namespace reanimated {

template <typename... TransformOps>
class CSSTransform final : public CSSValue {
 public:
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isObject())
      return false;
    auto obj = value.asObject(rt);
    auto names = obj.getPropertyNames(rt);
    if (names.size(rt) != 1)
      return false;
    auto name = names.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
    return ((std::string_view(TransformOps::key) == name) || ...);
  }

  CSSTransform(jsi::Runtime &rt, const jsi::Value &value) {
    auto obj = value.asObject(rt);
    auto name =
        obj.getPropertyNames(rt).getValueAtIndex(rt, 0).asString(rt).utf8(rt);
    auto val = obj.getProperty(rt, name.c_str());
    ((std::string_view(TransformOps::key) == name
          ? (transform_ = TransformOps(rt, val), true)
          : false) ||
     ...);
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
};

// Helper template for creating transform operations
template <std::string_view Name, typename T>
using TransformOp = CSSRecord<Field<Name, T>>;

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
