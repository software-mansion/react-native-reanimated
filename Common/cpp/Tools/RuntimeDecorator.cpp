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

void RuntimeDecorator::addGlobalMethods(jsi::Runtime &rt) {
  std::unordered_map<std::string, jsi::Value> properties;
  
  // add container
  properties["container"] = jsi::Object(rt);
  
  // event worklet constants
  properties["START"] = jsi::Value(2);
  properties["END"] = jsi::Value(5);
  properties["ACTIVE"] = jsi::Value(4);
  
  class Animated : public jsi::HostObject {
    std::unordered_map<std::string, jsi::Value> props;
  public:
    Animated(std::unordered_map<std::string, jsi::Value> && props) {
      this->props = std::move(props);
    }
    void set(jsi::Runtime &rt, const jsi::PropNameID &functionName, const jsi::Value &functionStr) {
      std::string label = functionName.utf8(rt);
      if (props.find(label) != props.end()) {
        return;
      }
      props[label] = rt.global().getPropertyAsFunction(rt, "eval").call(rt, functionStr.asString(rt).utf8(rt).c_str());
    }

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) {
      auto propName = name.utf8(rt);
  
      auto it = props.find(propName);
      
      if (it != props.end()) {
        return jsi::Value(rt, it->second);
      }

      return jsi::Value::undefined();
    }
    
    std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) {
      std::vector<jsi::PropNameID> res;
      for (auto &entry : props) {
        auto &propName = entry.first;
        res.push_back(jsi::PropNameID::forAscii(rt, propName));
      }
      return res;
    }

  };

  std::shared_ptr<jsi::HostObject> ptr(new Animated(std::move(properties)));

  jsi::Object animated = jsi::Object::createFromHostObject(rt, ptr);
  rt.global().setProperty(rt, "Reanimated", animated);
}
