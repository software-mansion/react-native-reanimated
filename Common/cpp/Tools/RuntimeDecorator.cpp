//
//  RuntimeDecorator.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 31/03/2020.
//

#include "RuntimeDecorator.h"
#include <memory>
#include "Logger.h"

void RuntimeDecorator::addGlobal(jsi::Runtime &rt) {
  // ...
}

void RuntimeDecorator::addReanimated(jsi::Runtime &rt) {
  std::unordered_map<std::string, jsi::Value> properties;
  
  // add container
  properties["container"] = jsi::Object(rt);
  
  // event worklet constants
  properties["START"] = jsi::Value(2);
  properties["END"] = jsi::Value(5);
  properties["ACTIVE"] = jsi::Value(4);
  
  obtainHostObject(rt, "Reanimated", std::move(properties));

  // this should bo moved to separate method addGlobal or something
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
      } else {
        Logger::log("unsupported value type");
      }
      return jsi::Value::undefined();
    };
  jsi::Value log = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "_log"), 1, callback);
	rt.global().setProperty(rt, "_log", log);

}

// WARNING: this works only for one level path e.g. a.b(), c.d()
// TODO make it work for any level: a.b.c.d(), a.b.c() etc.
std::shared_ptr<jsi::HostObject> RuntimeDecorator::obtainHostObject(
    jsi::Runtime &rt, 
    std::string path, 
    std::unordered_map<std::string, jsi::Value> properties) {
  // check for existence
  auto rea = rt.global().getProperty(rt, path.c_str());
  if (!rea.isUndefined() && rea.asObject(rt).isHostObject(rt)) {
    return rea.asObject(rt).getHostObject(rt);
  }
  // if does not exist, create
  std::shared_ptr<jsi::HostObject> ptr(new DecoratorHO(std::move(properties)));

  jsi::Object ho = jsi::Object::createFromHostObject(rt, ptr);
  rt.global().setProperty(rt, path.c_str(), ho);
  return ptr;
}
