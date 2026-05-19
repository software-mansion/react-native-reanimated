#pragma once

#include <jsi/jsi.h>

using namespace facebook;

namespace worklets {

inline void interceptEntryPoints(jsi::Runtime &rt) {
  jsi::Object descriptor(rt);
  descriptor.setProperty(rt, "configurable", true);
  descriptor.setProperty(rt, "enumerable", false);
  descriptor.setProperty(
      rt,
      "get",
      jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, "get"),
          0,
          [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) -> jsi::Value {
            return jsi::Function::createFromHostFunction(
                rt,
                jsi::PropNameID::forUtf8(rt, "noop"),
                0,
                [](jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) -> jsi::Value {
                  return jsi::Value::undefined();
                });
          }));
  descriptor.setProperty(
      rt,
      "set",
      jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, "set"),
          1,
          [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) -> jsi::Value {
            rt.global().setProperty(rt, "__e", args[0]);
            return jsi::Value::undefined();
          }));

  auto globalObj = rt.global();
  auto objectCtor = globalObj.getPropertyAsObject(rt, "Object");
  auto defineProperty = objectCtor.getPropertyAsFunction(rt, "defineProperty");
  defineProperty.call(rt, jsi::Value(rt, globalObj), jsi::String::createFromUtf8(rt, "__r"), std::move(descriptor));
}

inline void allowEntryPoints(jsi::Runtime &rt) {
  jsi::Object descriptor(rt);
  const auto require = rt.global().getProperty(rt, "__e").getObject(rt).getFunction(rt);

  descriptor.setProperty(rt, "configurable", true);
  descriptor.setProperty(rt, "enumerable", false);
  descriptor.setProperty(rt, "writable", true);
  descriptor.setProperty(rt, "value", jsi::Value(rt, require));

  auto globalObj = rt.global();
  auto objectCtor = globalObj.getPropertyAsObject(rt, "Object");
  auto defineProperty = objectCtor.getPropertyAsFunction(rt, "defineProperty");
  defineProperty.call(rt, jsi::Value(rt, globalObj), jsi::String::createFromUtf8(rt, "__r"), std::move(descriptor));
}

} // namespace worklets
