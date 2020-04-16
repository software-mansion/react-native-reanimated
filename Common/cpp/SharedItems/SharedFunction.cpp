//
//  SharedFunction.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 17/03/2020.
//

#include "SharedFunction.h"
#include "SharedValueRegistry.h"
#include "Logger.h"

SharedFunction::SharedFunction(int id, std::shared_ptr<Worklet> w) : SharedValue() {
  this->worklet = w;
  this->id = id;
  this->type = SharedValueType::shared_function;
  this->dirty = false;
  this->shouldBeSentToJava = false;
  this->parameter = jsi::Value::undefined();
}

jsi::Value SharedFunction::asValue(jsi::Runtime &rt) const {
  return jsi::Value::undefined();
}

void SharedFunction::setNewValue(std::shared_ptr<SharedValue> sv) {
  SharedFunction * sd = (SharedFunction*) sv.get();
  this->worklet = sd->worklet;
}

jsi::Value SharedFunction::asParameter(jsi::Runtime &rt) {
  if (!parameter.isUndefined()) {
    return parameter.getObject(rt);
  }

   auto callback = [this](
         jsi::Runtime &rt,
         const jsi::Value &thisValue,
         const jsi::Value *args,
         size_t count
         ) -> jsi::Value {

     if (count > 0 and
         args[0].isString() and
         args[0].asString(rt).utf8(rt) == "thisIsAHackToGetWorkletId") {
       return jsi::Value(worklet->workletId);
     }

     if (thisValue.isObject()) {
        return worklet->body->callWithThis(rt,
                                                thisValue.asObject(rt),
                                                static_cast<const jsi::Value*>(args),
                                                (size_t)count);
     } else {
        return worklet->body->call(rt, static_cast<const jsi::Value*>(args), (size_t)count);
     }
  };
  
  std::string idAsString = std::to_string(id);
  jsi::PropNameID name = jsi::PropNameID::forAscii(rt, idAsString);
  
  int length = worklet->length;
  this->parameter = jsi::Function::createFromHostFunction(rt, name, length, callback);
  
  return parameter.getObject(rt);
}

std::vector<int> SharedFunction::getSharedValues() {
  std::vector<int> res;
  res.push_back(id);
  return res;
}

std::shared_ptr<SharedValue> SharedFunction::copy() {
  
  int id = SharedValueRegistry::NEXT_SHARED_VALUE_ID--;
  return std::make_shared<SharedFunction>(id,
                                        worklet);
}

SharedFunction::~SharedFunction() {

}
