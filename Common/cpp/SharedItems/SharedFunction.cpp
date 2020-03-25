//
//  SharedFunction.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 17/03/2020.
//

#include "SharedFunction.h"

SharedFunction::SharedFunction(int id, std::shared_ptr<Worklet> w) : SharedValue() {
  this->worklet = w;
  this->id = id;
  this->type = SharedValueType::shared_function;
  this->dirty = false;
  this->shouldBeSentToJava = false;
}

jsi::Value SharedFunction::asValue(jsi::Runtime &rt) const {
  return jsi::Value::undefined();
}

void SharedFunction::setNewValue(std::shared_ptr<SharedValue> sv) {
  SharedFunction * sd = (SharedFunction*) sv.get();
  this->worklet = sd->worklet;
}

jsi::Value SharedFunction::asParameter(jsi::Runtime &rt) {
   auto callback = [this](
         jsi::Runtime &rt,
         const jsi::Value &thisValue,
         const jsi::Value *args,
         size_t count
         ) -> jsi::Value {
         
    return worklet->body->call(rt, args, count);
  };
  
  std::string idAsString = std::to_string(id);
  jsi::PropNameID name = jsi::PropNameID::forAscii(rt, idAsString);
  
  jsi::Function function = jsi::Function::createFromHostFunction(rt, name, 1, callback);
  return function;
}

std::vector<int> SharedFunction::getSharedValues() {
  std::vector<int> res;
  res.push_back(id);
  return res;
}

SharedFunction::~SharedFunction() {

}
