//
//  RuntimeDecorator.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 31/03/2020.
//

#include "RuntimeDecorator.h"
#include <unordered_map>
#include <memory>
#include "Logger.h"

void RuntimeDecorator::addNativeObjects(jsi::Runtime &rt) {
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
}
