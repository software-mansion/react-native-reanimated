//
// Created by Szymon Kapala on 2020-02-11.
//

#include "SharedDouble.h"

SharedDouble::SharedDouble(double value) : SharedValue() {
  this->value = value;
}

jsi::Value SharedDouble::asValue(jsi::Runtime &rt) {
  return Value(this->value);
}

void SharedDouble::setNewValue(SharedValue sv) {
  this->value = sv.value;
}

jsi::Object SharedDouble::asParameter(jsi::Runtime &rt) {

  class : public jsi::HostObject {
    double * value = nullptr;

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) {
      auto methodName = name.utf8(rt);

      if (methodName == "get") {

        auto callback = [](
          jsi::Runtime &runtime,
          const jsi::Value &thisValue,
          const jsi::Value *arguments,
          size_t count
        ) -> jsi::Value {
          return jsi::Value(*value);
        };
        return jsi::Function::createFromHostFunction(runtime, name, 0, callback);

      } else if (methodName == "set") {

        auto callback = [](
          jsi::Runtime &runtime,
          const jsi::Value &thisValue,
          const jsi::Value *arguments,
          size_t count
        ) -> jsi::Value {
          double newValue = arguments[0].asNumber();
          (*value) = newValue;
          return jsi::Value::undefined();
        };
        return jsi::Function::createFromHostFunction(runtime, name, 1, callback);

      }

      return jsi::Value::undefined();
    }

    void setValuePtr(double * ptr) {
      value = ptr;
    }
  } ho;

  ho.set(&value);
  return ho;
}

SharedDouble::~SharedDouble() {

}
