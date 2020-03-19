//
//  SharedArray.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 19/03/2020.
//

#include "SharedArray.h"

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
  return jsi::Value::undefined();
}

void SharedArray::setNewValue(std::shared_ptr<SharedValue> sv) {
  SharedArray * other = (SharedArray*) sv.get();
  this->svs = other->svs;
}

jsi::Value SharedArray::asParameter(jsi::Runtime &rt) {
  jsi::Array array(rt, svs.size());
  for (int i = 0; i < svs.size(); ++i) {
    array.setValueAtIndex(rt, i, svs[i]->asParameter(rt));
  }
  jsi::Object obj(std::move(array));
  obj.setProperty(rt, "id", jsi::Value(id));
  return obj;
}
