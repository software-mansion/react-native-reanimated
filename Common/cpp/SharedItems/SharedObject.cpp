//
//  SharedObject.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 19/03/2020.
//

#include "SharedObject.h"
#include "SharedValueRegistry.h"

SharedObject::SharedObject(int id,
                           std::vector<std::shared_ptr<SharedValue>> svs,
                           std::vector<std::string> names) {
  this->id = id;
  for (int i = 0; i < names.size(); ++i) {
    properties[names[i]] = svs[i];
  }
  this->dirty = false;
  this->shouldBeSentToJava = false;
  this->type = SharedValueType::shared_object;
  this->parameter = jsi::Value::undefined();
}

SharedObject::~SharedObject() {
  //noop
}

jsi::Value SharedObject::asValue(jsi::Runtime &rt) const {
  return jsi::Value::undefined();
}

void SharedObject::setNewValue(std::shared_ptr<SharedValue> sv) {
  SharedObject * other = (SharedObject*) sv.get();
  this->properties = other->properties;
}

jsi::Value SharedObject::asParameter(jsi::Runtime &rt) {
  if (!parameter.isUndefined()) {
    return parameter.getObject(rt);
  }
  
  class HO : public jsi::HostObject {
    std::unordered_map<std::string, std::shared_ptr<SharedValue>> props;
    int id;
  public:
    HO(int id, std::unordered_map<std::string, std::shared_ptr<SharedValue>> props) {
      this->props = props;
      this->id = id;
    }

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) {
      auto propName = name.utf8(rt);

      if (propName == "id") {
        return jsi::Value(id);
      }
      
      if (props.count(propName) > 0) {
        return props[propName]->asParameter(rt);
      }

      return jsi::Value::undefined();
    }
    
    std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) {
      std::vector<jsi::PropNameID> res;
      res.push_back(jsi::PropNameID::forAscii(rt, "id"));
      for (auto &entry : props) {
        auto &propName = entry.first;
        if (propName != "id") {
          res.push_back(jsi::PropNameID::forAscii(rt, propName));
        }
      }
      return res;
    }

  };

  std::shared_ptr<jsi::HostObject> ptr(new HO(id, this->properties));

  this->parameter = jsi::Object::createFromHostObject(rt, ptr);
  return parameter.getObject(rt);
}

std::vector<int> SharedObject::getSharedValues() {
  std::vector<int> res;
  for (auto p : properties) {
    std::vector<int> innerRes = p.second->getSharedValues();
    for (auto id : innerRes) {
      res.push_back(id);
    }
  }
  return res;
}

std::shared_ptr<SharedValue> SharedObject::copy() {
  std::vector<std::shared_ptr<SharedValue>> copiedSvs;
  std::vector<std::string> copiedNames;
  for (auto &entry : properties) {
    copiedSvs.push_back(entry.second->copy());
    copiedNames.push_back(entry.first);
  }
  int id = SharedValueRegistry::NEXT_SHARED_VALUE_ID--;
  return std::make_shared<SharedObject>(id, copiedSvs, copiedNames);
}
