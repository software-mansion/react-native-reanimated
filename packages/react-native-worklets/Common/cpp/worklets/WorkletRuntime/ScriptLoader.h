#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/ScriptBuffer.h>

namespace worklets {

class ScriptLoader {

 public:
  /**
   * Safely loads the bundle into the Worklet Runtime and executes Worklets' entry point.
   */
  static void loadScript(
      facebook::jsi::Runtime &rt,
      const std::shared_ptr<const ScriptBuffer> &script,
      const std::string &sourceUrl) {
    interceptEntryPoints(rt);
    rt.evaluateJavaScript(script, sourceUrl);
    allowEntryPoints(rt);
    loadWorkletsEntryPoint(rt);
  }

 private:
  /**
   * Sets the `require` function on the global object with a noop getter
   * and a setter that saves the actual implementation of `require` for later use.
   *
   * This is necessary to prevent running the App and React Native entry-points when evaluating the bundle.
   */
  static void interceptEntryPoints(facebook::jsi::Runtime &rt) {
    facebook::jsi::Object descriptor(rt);
    descriptor.setProperty(rt, "configurable", true);
    descriptor.setProperty(rt, "enumerable", false);
    descriptor.setProperty(
        rt,
        "get",
        facebook::jsi::Function::createFromHostFunction(
            rt,
            facebook::jsi::PropNameID::forUtf8(rt, "get"),
            0,
            [](facebook::jsi::Runtime &rt, const facebook::jsi::Value &, const facebook::jsi::Value *, size_t)
                -> facebook::jsi::Value {
              return facebook::jsi::Function::createFromHostFunction(
                  rt,
                  facebook::jsi::PropNameID::forUtf8(rt, "noop"),
                  0,
                  [](facebook::jsi::Runtime &, const facebook::jsi::Value &, const facebook::jsi::Value *, size_t)
                      -> facebook::jsi::Value { return facebook::jsi::Value::undefined(); });
            }));
    descriptor.setProperty(
        rt,
        "set",
        facebook::jsi::Function::createFromHostFunction(
            rt,
            facebook::jsi::PropNameID::forUtf8(rt, "set"),
            1,
            [](facebook::jsi::Runtime &rt, const facebook::jsi::Value &, const facebook::jsi::Value *args, size_t count)
                -> facebook::jsi::Value {
              rt.global().setProperty(rt, requireSavedName, args[0]);
              return facebook::jsi::Value::undefined();
            }));

    const auto globalObj = rt.global();
    const auto objectCtor = globalObj.getPropertyAsObject(rt, "Object");
    const auto defineProperty = objectCtor.getPropertyAsFunction(rt, "defineProperty");
    defineProperty.call(
        rt,
        facebook::jsi::Value(rt, globalObj),
        facebook::jsi::String::createFromUtf8(rt, requireName),
        std::move(descriptor));
  }

  /**
   * Restores the original `require` function on the global object after evaluating the bundle.
   * This way we can use worklets as entry points.
   */
  static void allowEntryPoints(facebook::jsi::Runtime &rt) {
    facebook::jsi::Object descriptor(rt);
    const auto require = rt.global().getProperty(rt, requireSavedName).getObject(rt).getFunction(rt);

    descriptor.setProperty(rt, "configurable", true);
    descriptor.setProperty(rt, "enumerable", false);
    descriptor.setProperty(rt, "writable", true);
    descriptor.setProperty(rt, "value", facebook::jsi::Value(rt, require));

    const auto globalObj = rt.global();
    const auto objectCtor = globalObj.getPropertyAsObject(rt, "Object");
    const auto defineProperty = objectCtor.getPropertyAsFunction(rt, "defineProperty");
    defineProperty.call(
        rt,
        facebook::jsi::Value(rt, globalObj),
        facebook::jsi::String::createFromUtf8(rt, requireName),
        std::move(descriptor));
  }

  static void loadWorkletsEntryPoint(facebook::jsi::Runtime &rt) {

    const auto require = rt.global().getProperty(rt, requireName).getObject(rt).getFunction(rt);
    require.call(rt, workletsEntryPointId);
  }

  static constexpr auto requireName = "__r";
  static constexpr auto requireSavedName = "__e";
  static constexpr auto workletsEntryPointId = -2;
};

} // namespace worklets
