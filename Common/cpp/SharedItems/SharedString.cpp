//
// Created by Szymon Kapala on 2020-02-14.
//

#include "SharedString.h"
#include "SharedValueRegistry.h"

SharedString::SharedString(int id,
                           std::string value,
                           std::shared_ptr<SharedValueRegistry> sharedValueRegistry) {
  this->value = value;
  this->id = id;
  this->type = SharedValueType::shared_string;
  this->parameter = jsi::Value::undefined();
  this->sharedValueRegistry = sharedValueRegistry;
}

SharedString::~SharedString() {}

jsi::Value SharedString::asValue(jsi::Runtime &rt) const {
  return jsi::String::createFromAscii(rt, value);
}

jsi::Value SharedString::asParameter(jsi::Runtime &rt, std::shared_ptr<SharedValue> sv) {
  if (!parameter.isUndefined()) {
    return parameter.getObject(rt);
  }

  class HO : public jsi::HostObject {
      public:
      std::weak_ptr<SharedString> ss;

      HO(std::shared_ptr<SharedString> ss) {
        this->ss = ss;
      }

      jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) {
        auto propName = name.utf8(rt);

        if (propName == "value") {
          return jsi::String::createFromAscii(rt, ss.lock()->value);
        } else if (propName == "set") {

          auto callback = [this, &rt](
            jsi::Runtime &runtime,
            const jsi::Value &thisValue,
            const jsi::Value *arguments,
            size_t count
          ) -> jsi::Value {
            ss.lock()->makeDirty();
            std::string newValue = arguments[0].asString(rt).utf8(rt);
            ss.lock()->value = newValue;
            return jsi::Value::undefined();
          };
          return jsi::Function::createFromHostFunction(rt, name, 1, callback);

        } else if (propName == "id") {
          return jsi::Value((double)ss.lock()->id);
        } else if (propName == "__baseType") {
          return jsi::Value((bool)true);
        }

        return jsi::Value::undefined();
      }

    };

  std::shared_ptr<jsi::HostObject> ptr(new HO(std::dynamic_pointer_cast<SharedString>(sv)));

    this->parameter = jsi::Object::createFromHostObject(rt, ptr);
    return parameter.getObject(rt);
}

void SharedString::setNewValue(std::shared_ptr<SharedValue> sv) {
  SharedString * sharedString = (SharedString*)sv.get();
  this->value = sharedString->value;
  this->dirty = true;
}

std::shared_ptr<SharedValue> SharedString::copy() {
  
  int id = SharedValueRegistry::NEXT_SHARED_VALUE_ID--;
  return std::make_shared<SharedString>(id,
                                        value,
                                        sharedValueRegistry.lock());
}

std::vector<int> SharedString::getSharedValues() {
  std::vector<int> res;
  res.push_back(id);
  return res;
}
