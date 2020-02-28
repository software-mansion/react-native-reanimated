//
// 
//

#include "SharedBoolean.h"

#include <android/log.h>
#define APPNAME "NATIVE_REANIMATED"

SharedBoolean::SharedBoolean(int id, bool value) : SharedValue() {
  this->value = value;
  this->id = id;
  this->type = 'B';
}

jsi::Value SharedBoolean::asValue(jsi::Runtime &rt) const {
  return jsi::Value(this->value);
}

void SharedBoolean::setNewValue(std::shared_ptr<SharedValue> sv) {
  SharedBoolean * sd = (SharedBoolean*) sv.get();
  this->value = sd->value;
  this->dirty = true;
}

jsi::Object SharedBoolean::asParameter(jsi::Runtime &rt) {

  class HO : public jsi::HostObject {
    public:
    bool * value = nullptr;
    bool * dirty = nullptr;
    int id;

    HO(int id, bool * val, bool * dirty) {
      this->value = val;
      this->dirty = dirty;
      this->id = id;
    }

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) {
      auto propName = name.utf8(rt);

      if (propName == "get") {

        auto callback = [this](
          jsi::Runtime &runtime,
          const jsi::Value &thisValue,
          const jsi::Value *arguments,
          size_t count
        ) -> jsi::Value {
          return jsi::Value(*value);
        };
        return jsi::Function::createFromHostFunction(rt, name, 0, callback);

      } else if (propName == "set") {

        auto callback = [this](
          jsi::Runtime &runtime,
          const jsi::Value &thisValue,
          const jsi::Value *arguments,
          size_t count
        ) -> jsi::Value {
          (*dirty) = true;
          //double newValue = arguments[0].asNumber();
          bool newValue = (bool)arguments[0].asNumber();
          (*value) = newValue;
          return jsi::Value::undefined();
        };
        return jsi::Function::createFromHostFunction(rt, name, 1, callback);

      } else if (propName == "id") {
        return jsi::Value((double)id);
      }

      return jsi::Value::undefined();
    }

  };

  std::shared_ptr<jsi::HostObject> ptr(new HO(id, &value, &dirty));

  return jsi::Object::createFromHostObject(rt, ptr);
}

SharedBoolean::~SharedBoolean() {

}
