#include "RuntimeDecorator.h"
#include <unordered_map>
#include <memory>
#include "Logger.h"

namespace reanimated {

void RuntimeDecorator::addNativeObjects(jsi::Runtime &rt, UpdaterFunction updater, RequestFrameFunction requestFrame) {
  rt.global().setProperty(rt, "_WORKLET", jsi::Value(true));

  auto callback = [](
      jsi::Runtime &rt,
      const jsi::Value &thisValue,
      const jsi::Value *args,
      size_t count
      ) -> jsi::Value {
    const jsi::Value *value = &args[0];
    if (value->isString()) {
      Logger::log(value->getString(rt).utf8(rt).c_str());
    } else if (value->isNumber()) {
      Logger::log(value->getNumber());
    } else if (value->isUndefined()) {
      Logger::log("undefined");
    } else {
      Logger::log("unsupported value type");
    }
    return jsi::Value::undefined();
    };
  jsi::Value log = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "_log"), 1, callback);
	rt.global().setProperty(rt, "_log", log);


  auto clb = [updater](
      jsi::Runtime &rt,
      const jsi::Value &thisValue,
      const jsi::Value *args,
      size_t count
      ) -> jsi::Value {
    const auto viewTag = args[0].asNumber();
    const auto params = args[1].asObject(rt);
    updater(rt, viewTag, params);
    return jsi::Value::undefined();
  };
  jsi::Value updateProps = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "_updateProps"), 2, clb);
  rt.global().setProperty(rt, "_updateProps", updateProps);


  auto clb2 = [requestFrame](
      jsi::Runtime &rt,
      const jsi::Value &thisValue,
      const jsi::Value *args,
      size_t count
      ) -> jsi::Value {
    auto fun = std::make_shared<jsi::Function>(args[0].asObject(rt).asFunction(rt));
    requestFrame([&rt, fun](double timestampMs) {
      fun->call(rt, jsi::Value(timestampMs));
    });
    return jsi::Value::undefined();
  };
  jsi::Value requestAnimationFrame = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "requestAnimationFrame"), 1, clb2);
  rt.global().setProperty(rt, "requestAnimationFrame", requestAnimationFrame);

}

}
