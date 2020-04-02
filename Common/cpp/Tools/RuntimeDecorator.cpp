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
  
  // add assign method
  std::string assignCode = R"((function assign(left, right) {
  if ((typeof right === 'object') && (!right.value)) {
    for (let key of Object.keys(right)) {
      if (left[key]) {
        assign(left[key], right[key]);
      }
    }

  } else if (Array.isArray(right)) {
    for (let i; i < right.length; i++) {
      assign(left[i], right[i]);
    }

  } else {
    if (left.set) {
      if (right.value) {
        left.set(right.value);
      } else {
        left.set(right);
      }
    }
  }}))";
  properties["assign"] = rt.evaluateJavaScript(std::make_shared<jsi::StringBuffer>(assignCode), "");
  
  // add startUpdater method
  std::string startUpdater = R"((function startUpdater(sv, worklet, params) {
    params = ([sv]).concat(params);
    sv.bind(worklet.startTentatively.apply(undefined, params));
  }))";
  
  properties["startUpdater"] = rt.evaluateJavaScript(std::make_shared<jsi::StringBuffer>(startUpdater), "");
  
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
  rt.global().setProperty(rt, "Animated", animated);
}
