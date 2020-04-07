//
// Created by Szymon Kapala on 2020-02-11.
//

#include "SharedDouble.h"

SharedDouble::SharedDouble(int id,
                           double value,
                           std::shared_ptr<ApplierRegistry> applierRegistry,
                           std::shared_ptr<SharedValueRegistry> sharedValueregistry,
                           std::shared_ptr<WorkletRegistry> workletRegistry,
                           std::shared_ptr<ErrorHandler> errorHandler
                           ) : SharedValue() {
  this->value = value;
  this->id = id;
  this->type = SharedValueType::shared_double;
  this->applierRegistry = applierRegistry;
  this->sharedValueregistry = sharedValueregistry;
  this->workletRegistry = workletRegistry;
  this->errorHandler = errorHandler;
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
    std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
    std::shared_ptr<WorkletRegistry> workletRegistry;
    std::shared_ptr<ErrorHandler> errorHandler;

    HO(int id,
       double * val,
       bool * dirty,
       int *bindedApplierId,
       std::shared_ptr<ApplierRegistry> applierRegistry,
       std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
       std::shared_ptr<WorkletRegistry> workletRegistry,
       std::shared_ptr<ErrorHandler> errorHandler) {
      this->value = val;
      this->dirty = dirty;
      this->id = id;
      this->bindedApplierId = bindedApplierId;
      this->applierRegistry = applierRegistry;
      this->sharedValueRegistry = sharedValueRegistry;
      this->workletRegistry = workletRegistry;
      this->errorHandler = errorHandler;
    }
    
    void cleanBeforeSet(jsi::Runtime &rt) {
      if ((*bindedApplierId) != -1) {
        applierRegistry->unregisterApplierFromRender(*bindedApplierId, rt);
        *bindedApplierId = -1;
      }
    }
    
    void forceSet(jsi::Runtime &rt, const jsi::Value & newValue) {
      (*dirty) = true;
      (*value) = newValue.asNumber();
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

          cleanBeforeSet(rt);
          
          if (arguments[0].isNumber()) {
            forceSet(rt, arguments[0]);
          } else {
            jsi::Value input(rt, arguments[0]);
            if (input.asObject(rt).hasProperty(rt, "value")) {
              input = input.asObject(rt).getProperty(rt, "value");
            }
            int applierId = input.asObject(rt).getProperty(rt, "applierId").asNumber();
            *bindedApplierId = applierId;
            std::shared_ptr<Applier> applier = applierRegistry->getRenderApplier(applierId);
            applier->sharedValues[0] = sharedValueRegistry->getSharedValue(id);
          }
          return jsi::Value::undefined();
        };
        
        return jsi::Function::createFromHostFunction(rt, name, 1, callback);

      } else if (propName == "id") {
        return jsi::Value((double)id);
      } else if (propName == "bind") {
        auto callback = [this](
           jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *arguments,
           size_t count
         ) -> jsi::Value {

          cleanBeforeSet(rt);
          *bindedApplierId = arguments[0].asNumber();
           
          return jsi::Value::undefined();
         };
         
         return jsi::Function::createFromHostFunction(rt, name, 1, callback);
      } else if (propName == "stop") {
        auto callback = [this](
          jsi::Runtime &rt,
          const jsi::Value &thisValue,
          const jsi::Value *arguments,
          size_t count
        ) -> jsi::Value {

         cleanBeforeSet(rt);
        
         return jsi::Value::undefined();
        };
        
        return jsi::Function::createFromHostFunction(rt, name, 0, callback);
      } else if (propName == "forceSet") {
        auto callback = [this](
          jsi::Runtime &rt,
          const jsi::Value &thisValue,
          const jsi::Value *arguments,
          size_t count
        ) -> jsi::Value {

          forceSet(rt, arguments[0]);
          return jsi::Value::undefined();
        };

        return jsi::Function::createFromHostFunction(rt, name, 1, callback);
      }
      return jsi::Value::undefined();
    }
  };

  std::shared_ptr<jsi::HostObject> ptr(new HO(id,
                                              &value,
                                              &dirty,
                                              &bindedApplierId,
                                              applierRegistry,
                                              sharedValueregistry,
                                              workletRegistry,
                                              errorHandler));

  return jsi::Object::createFromHostObject(rt, ptr);
}

std::vector<int> SharedDouble::getSharedValues() {
  std::vector<int> res;
  res.push_back(id);
  return res;
}

std::shared_ptr<SharedValue> SharedDouble::copy() {
  
  int id = SharedValueRegistry::NEXT_SHARED_VALUE_ID--;
  return std::make_shared<SharedDouble>(id,
                                        value,
                                        applierRegistry,
                                        sharedValueregistry,
                                        workletRegistry,
                                        errorHandler);
}

void SharedDouble::willUnregister(jsi::Runtime &rt) {
  if (bindedApplierId != -1) {
    applierRegistry->unregisterApplierFromRender(bindedApplierId, rt);
    bindedApplierId = -1;
  }
}

SharedDouble::~SharedDouble() {

}
