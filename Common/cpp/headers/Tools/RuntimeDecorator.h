//
//  RuntimeDecorator.hpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 31/03/2020.
//

#ifndef RuntimeDecorator_h
#define RuntimeDecorator_h

#include <stdio.h>
#include <jsi/jsi.h>
#include <string>
#include <unordered_map>

using namespace facebook;

class RuntimeDecorator {

  class DecoratorHO : public jsi::HostObject {
    std::unordered_map<std::string, jsi::Value> props;
  public:
    DecoratorHO(std::unordered_map<std::string, jsi::Value> && props) {
      this->props = std::move(props);
    }
    void set(jsi::Runtime &rt, const jsi::PropNameID &functionName, const jsi::Value &functionStr) {
      std::string label = functionName.utf8(rt);
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
public:
  static void addGlobal(jsi::Runtime &rt);
  static void addReanimated(jsi::Runtime &rt);
  static std::shared_ptr<jsi::HostObject> obtainHostObject(
    jsi::Runtime &rt,
    std::string path,
    std::unordered_map<std::string, jsi::Value> properties);
};

#endif /* RuntimeDecorator_h */
