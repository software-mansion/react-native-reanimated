//
// Created by Szymon Kapala on 2020-02-11.
//

#include "SharedDouble.h"

SharedDouble::SharedDouble(int id,
                           double value,
                           std::shared_ptr<ApplierRegistry> applierRegistry
                           ) : SharedValue() {
  this->value = value;
  this->id = id;
  this->type = SharedValueType::shared_double;
  this->applierRegistry = applierRegistry;
}

jsi::Value SharedDouble::asValue(jsi::Runtime &rt) const {
  return jsi::Value(this->value);
}

void SharedDouble::setNewValue(std::shared_ptr<SharedValue> sv) {
  SharedDouble * sd = (SharedDouble*) sv.get();
  this->value = sd->value;
  this->dirty = true;
}

jsi::Value SharedDouble::asParameter(jsi::Runtime &rt) {

  class HO : public jsi::HostObject {
    public:
    double * value = nullptr;
    bool * dirty = nullptr;
    int id;
    int * bindedApplierId;
    std::shared_ptr<ApplierRegistry> applierRegistry;

    HO(int id,
       double * val,
       bool * dirty,
       int *bindedApplierId,
       std::shared_ptr<ApplierRegistry> applierRegistry) {
      this->value = val;
      this->dirty = dirty;
      this->id = id;
      this->bindedApplierId = bindedApplierId;
      this->applierRegistry = applierRegistry;
    }
    
    void cleanBeforeSet() {
      if ((*bindedApplierId) != -1) {
        applierRegistry->unregisterApplierFromRender(*bindedApplierId);
        *bindedApplierId = -1;
      }
    }
    
    void forceSet(jsi::Runtime &rt, const jsi::Value & newValue) {
      (*dirty) = true;
      (*value) = newValue.asNumber();
    }
    
    void bindApplier(jsi::Runtime &rt, const jsi::Value & config) {
      //TODO
    }

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) {
      auto propName = name.utf8(rt);

      if (propName == "value") {
          return jsi::Value(*value);
      } else if (propName == "set") {

        auto callback = [this](
          jsi::Runtime &rt,
          const jsi::Value &thisValue,
          const jsi::Value *arguments,
          size_t count
        ) -> jsi::Value {

          cleanBeforeSet();
          
          if (arguments[0].isNumber()) {
            forceSet(rt, arguments[0]);
          } else {
            bindApplier(rt, arguments[0]);
          }
          return jsi::Value::undefined();
        };
        
        return jsi::Function::createFromHostFunction(rt, name, 1, callback);

      } else if (propName == "id") {
        return jsi::Value((double)id);
      }

      return jsi::Value::undefined();
    }

  };

  std::shared_ptr<jsi::HostObject> ptr(new HO(id,
                                              &value,
                                              &dirty,
                                              &bindedApplierId,
                                              applierRegistry));

  return jsi::Object::createFromHostObject(rt, ptr);
}

std::vector<int> SharedDouble::getSharedValues() {
  std::vector<int> res;
  res.push_back(id);
  return res;
}

SharedDouble::~SharedDouble() {

}
