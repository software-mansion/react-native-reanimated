//
// Created by Szymon Kapala on 2020-02-11.
//

#include "SharedDouble.h"

SharedDouble::SharedDouble(int id,
                           double value,
                           std::shared_ptr<ApplierRegistry> applierRegistry,
                           std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
                           std::shared_ptr<WorkletRegistry> workletRegistry
                           ) : SharedValue() {
  this->value = value;
  this->id = id;
  this->type = SharedValueType::shared_double;
  this->applierRegistry = applierRegistry;
  this->sharedValueRegistry = sharedValueRegistry;
  this->workletRegistry = workletRegistry;
  this->parameter = jsi::Value::undefined();
}

jsi::Value SharedDouble::asValue(jsi::Runtime &rt) const {
  return jsi::Value(this->value);
}

void SharedDouble::setNewValue(std::shared_ptr<SharedValue> sv) {
  SharedDouble * sd = (SharedDouble*) sv.get();
  this->value = sd->value;
  makeDirty();
}

jsi::Value SharedDouble::asParameter(jsi::Runtime &rt, std::shared_ptr<SharedValue> sv) {
  
  if (!parameter.isUndefined()) {
    return parameter.getObject(rt);
  }

  class HO : public jsi::HostObject {
    public:
    std::weak_ptr<SharedDouble> sd;
    std::weak_ptr<ApplierRegistry> applierRegistry;
    std::weak_ptr<SharedValueRegistry> sharedValueRegistry;
    std::weak_ptr<WorkletRegistry> workletRegistry;

    HO(std::shared_ptr<SharedDouble> sd,
       std::weak_ptr<ApplierRegistry> applierRegistry,
       std::weak_ptr<SharedValueRegistry> sharedValueRegistry,
       std::weak_ptr<WorkletRegistry> workletRegistry) {
      this->sd = sd;
      this->applierRegistry = applierRegistry;
      this->sharedValueRegistry = sharedValueRegistry;
      this->workletRegistry = workletRegistry;
    }
    
    void cleanBeforeSet(jsi::Runtime &rt) {
      if (sd.lock()->bindedApplierId != -1) {
        applierRegistry.lock()->unregisterApplierFromRender(sd.lock()->bindedApplierId, rt);
        sd.lock()->bindedApplierId = -1;
      }
    }
    
    void forceSet(jsi::Runtime &rt, const jsi::Value & newValue) {
      sd.lock()->makeDirty();
      sd.lock()->value = newValue.asNumber();
    }

    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) {
      auto propName = name.utf8(rt);

      if (propName == "value") {
        return jsi::Value(sd.lock()->value);
      } else if (propName == "set") {

        auto callback = [this](
          jsi::Runtime &rt,
          const jsi::Value &thisValue,
          const jsi::Value *arguments,
          size_t count
        ) -> jsi::Value {
          
          if (arguments[0].isNumber()) {
            cleanBeforeSet(rt);
            forceSet(rt, arguments[0]);
          } else {
            jsi::Value input(rt, arguments[0]);
            if (input.asObject(rt).hasProperty(rt, "value")) {
              input = input.asObject(rt).getProperty(rt, "value");
            }
            int applierId = input.asObject(rt).getProperty(rt, "applierId").asNumber();
            
            if (applierId != sd.lock()->bindedApplierId) {
              cleanBeforeSet(rt);
              sd.lock()->bindedApplierId = applierId;
            }
            
            std::shared_ptr<Applier> applier = applierRegistry.lock()->getRenderApplier(applierId);
            applier->sharedValues[0] = sharedValueRegistry.lock()->getSharedValue(sd.lock()->id);
          }
          return jsi::Value::undefined();
        };
        
        return jsi::Function::createFromHostFunction(rt, name, 1, callback);

      } else if (propName == "id") {
        return jsi::Value((double)sd.lock()->id);
      } else if (propName == "bind") {
        auto callback = [this](
           jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *arguments,
           size_t count
         ) -> jsi::Value {

          int applierId = arguments[0].asNumber();
          
          if (applierId != (sd.lock()->bindedApplierId)) {
            cleanBeforeSet(rt);
            sd.lock()->bindedApplierId = applierId;
          }
          
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
      } else if (propName == "__baseType") {
        return jsi::Value((bool)true);
      }
      return jsi::Value::undefined();
    }
  };

  std::shared_ptr<jsi::HostObject> ptr(new HO(std::dynamic_pointer_cast<SharedDouble>(sv),
                                              applierRegistry,
                                              sharedValueRegistry,
                                              workletRegistry));

  this->parameter = jsi::Object::createFromHostObject(rt, ptr);
  return parameter.getObject(rt);
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
                                        applierRegistry.lock(),
                                        sharedValueRegistry.lock(),
                                        workletRegistry.lock());
}

void SharedDouble::willUnregister(jsi::Runtime &rt) {
  if (bindedApplierId != -1) {
    applierRegistry.lock()->unregisterApplierFromRender(bindedApplierId, rt);
    bindedApplierId = -1;
  }
}

SharedDouble::~SharedDouble() {

}
