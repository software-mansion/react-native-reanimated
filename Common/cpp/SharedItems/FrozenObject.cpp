#include "FrozenObject.h"
#include "RuntimeManager.h"
#include "ShareableValue.h"
#include "SharedParent.h"

namespace reanimated {

jsi::Value functionToString(jsi::Runtime &rt, const jsi::Function &obj) {
  jsi::Function toString = rt.global()
      .getPropertyAsObject(rt, "Function")
      .getPropertyAsObject(rt, "prototype")
      .getPropertyAsFunction(rt, "toString");
  jsi::Value code = toString.callWithThis(rt, obj);
  if (!code.isString()) {
      throw jsi::JSError(rt, "toString() return value isn't a string");
  }
  return code;
}

FrozenObject::FrozenObject(
    jsi::Runtime &rt,
    const jsi::Object &object,
    RuntimeManager *runtimeManager) {
  auto propertyNames = object.getPropertyNames(rt);
  const size_t count = propertyNames.size(rt);
  namesOrder.reserve(count);
  for (size_t i = 0; i < count; i++) {
    auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt);
    namesOrder.push_back(propertyName.utf8(rt));
    std::string nameStr = propertyName.utf8(rt);
    if (nameStr == "__reanimated_workletFunction") {
        // Save the function's source code, not the function itself
        jsi::Function workletFunction = object.getPropertyAsFunction(rt, "__reanimated_workletFunction");
        jsi::Value code = functionToString(rt, workletFunction);
        map["__reanimated_workletFunction"] = ShareableValue::adapt(
            rt, code, runtimeManager);
    } else {
        map[nameStr] = ShareableValue::adapt(
            rt, object.getProperty(rt, propertyName), runtimeManager);
        this->containsHostFunction |= map[nameStr]->containsHostFunction;
    }
  }
}

jsi::Object FrozenObject::shallowClone(jsi::Runtime &rt) {
  jsi::Object object(rt);
  for (auto propName : namesOrder) {
    auto value = map[propName];
    object.setProperty(
        rt, jsi::String::createFromUtf8(rt, propName), value->getValue(rt));
  }
  return object;
}

} // namespace reanimated
