//
//  SharedArray.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 19/03/2020.
//

#include "SharedArray.h"
#include <jsi/jsi.h>

SharedArray::SharedArray(int id, std::vector<std::shared_ptr<SharedValue>> svs) {
  this->id = id;
  this->svs = svs;
  this->dirty = false;
  this->shouldBeSentToJava = false;
  this->type = SharedValueType::shared_array;
}

SharedArray::~SharedArray() {
  //noop
}

jsi::Value SharedArray::asValue(jsi::Runtime &rt) const {
  jsi::Array array(rt, svs.size());
  for (int i = 0; i < svs.size(); ++i) {
    array.setValueAtIndex(rt, i, svs[i]->asValue(rt));
  }
  return array;
}

void SharedArray::setNewValue(std::shared_ptr<SharedValue> sv) {
  SharedArray * other = (SharedArray*) sv.get();
  this->svs = other->svs;
}

jsi::Value SharedArray::asParameter(jsi::Runtime &rt) {

  class HO : public jsi::HostObject {
    std::vector<std::shared_ptr<SharedValue>> svs;
    int id;
  public:
    HO(int id, std::vector<std::shared_ptr<SharedValue>> svs) {
      this->svs = svs;
      this->id = id;
    }

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) {
      auto propName = name.utf8(rt);

      if (propName == "id") {
        return jsi::Value(id);
      }
      if (propName == "type") {
        return jsi::Value(jsi::String::createFromAscii(rt, std::string("array")));
      }
      
      jsi::Array array(rt, svs.size());
        for (int i = 0; i < svs.size(); ++i) {
          array.setValueAtIndex(rt, i, svs[i]->asParameter(rt));
        }
        return array;
      }

  };

  std::shared_ptr<jsi::HostObject> ptr(new HO(id, this->svs));

  return jsi::Object::createFromHostObject(rt, ptr);
}

std::vector<int> SharedArray::getSharedValues() {
  std::vector<int> res;
  for (auto &sv : svs) {
    std::vector<int> innerRes = sv->getSharedValues();
    for (auto id : innerRes) {
      res.push_back(id);
    }
  }
  return res;
}
