//
//  SharedObject.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 19/03/2020.
//

#include "SharedObject.h"

class SharedObject : public SharedValue {
public:
    int id;
    SharedObject(int id, std::vector<std::shared_ptr<SharedValue>> svs);
    jsi::Value asValue(jsi::Runtime &rt) const override;
    jsi::Value asParameter(jsi::Runtime &rt) override;
    void setNewValue(std::shared_ptr<SharedValue> sv) override;
    ~SharedObject();
private:
  std::unordered_map<std::string, std::shared_ptr<SharedValue>> properties;
};


SharedObject::SharedObject(int id, std::vector<std::shared_ptr<SharedValue>> svs) {
  this->id = id;
  this->svs = svs;
  this->dirty = false;
  this->shouldBeSentToJava = false;
  this->type = SharedValueType::shared_object;
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
  jsi::Array array(rt, svs.size());
  for (int i = 0; i < svs.size(); ++i) {
    array.setValueAtIndex(rt, i, svs[i]->asParameter(rt));
  }
  jsi::Object obj(std::move(array));
  obj.setProperty(rt, "id", jsi::Value(id));
  return obj;
}
