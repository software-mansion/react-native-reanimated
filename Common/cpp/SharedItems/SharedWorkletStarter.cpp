//
// Created by Szymon Kapala on 2020-03-05.
//
#include "SharedWorkletStarter.h"
#include "WorkletModule.h"
#include "Logger.h"

SharedWorkletStarter::SharedWorkletStarter(
      int svId,
      std::shared_ptr<Worklet> worklet,
      std::vector<int> args,
      std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
      std::shared_ptr<ApplierRegistry> applierRegistry) {
  this->id = svId;
  this->worklet = worklet;
  this->args = args;
  this->shouldBeSentToJava = false;
  this->type = SharedValueType::shared_starter;
  this->sharedValueRegistry = sharedValueRegistry;
  this->applierRegistry = applierRegistry;
  this->applierId = ApplierRegistry::New_Applier_Id--;
  this->parameter = jsi::Value::undefined();
}

jsi::Value SharedWorkletStarter::asValue(jsi::Runtime &rt) const {
  return jsi::Value::undefined();
}

void SharedWorkletStarter::setNewValue(std::shared_ptr<SharedValue> sv) {
  // noop
}

SharedWorkletStarter::~SharedWorkletStarter() {
  
}

jsi::Value SharedWorkletStarter::asParameter(jsi::Runtime &rt, std::shared_ptr<SharedValue> sv) {
  if (!parameter.isUndefined()) {
    return parameter.getObject(rt);
  }
  
  class HO : public jsi::HostObject {
    public:
    int id;
    std::weak_ptr<SharedWorkletStarter> starter;
    std::weak_ptr<SharedValueRegistry> sharedValueRegistry;
    std::weak_ptr<ApplierRegistry> applierRegistry;

    HO(int id,
        std::shared_ptr<SharedWorkletStarter> starter,
        std::weak_ptr<SharedValueRegistry> sharedValueRegistry,
        std::weak_ptr<ApplierRegistry> applierRegistry) {
      this->id = id;
      this->starter = starter;
      this->sharedValueRegistry = sharedValueRegistry;
      this->applierRegistry = applierRegistry;
    }

    int startTentatively(jsi::Runtime &rt, const jsi::Value *args, int count) {
      std::vector<std::shared_ptr<SharedValue>> sharedValues;
      for (int i = 0; i < starter.lock()->worklet->length; ++i) {
        std::shared_ptr<SharedValue> sv;
        if (i < count and args[i].isObject() and args[i].getObject(rt).hasProperty(rt, "id")) {
          int svId = args[i].getObject(rt).getProperty(rt, "id").asNumber();
          sv = sharedValueRegistry.lock()->getSharedValue(svId);
          if (sv == nullptr) return -1;
          sharedValues.push_back(sv);
          continue;
        }
        std::shared_ptr<SharedValue> defaultSV = sharedValueRegistry.lock()->getSharedValue(starter.lock()->args[i]);
        if (defaultSV == nullptr) return -1;
        sv = defaultSV->copy();
        sharedValues.push_back(sv);
        
        if (i < count) {
          jsi::Function assign = rt.global().getPropertyAsObject(rt, "Reanimated").getPropertyAsFunction(rt, "assign");
          assign.call(rt, sv->asParameter(rt, sv), args[i]);
        }
      }
      
      int applierId = ApplierRegistry::New_Applier_Id--;
      std::shared_ptr<Applier> applier(new Applier(applierId, starter.lock()->worklet, sharedValues, sharedValueRegistry.lock()));
      
      applierRegistry.lock()->registerApplierForRender(applierId, applier);
      return applierId;
    }
    
    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) {
      auto propName = name.utf8(rt);
      if (propName == "start") {
        auto callback = [this](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count
        ) -> jsi::Value {
          int applierId = starter.lock()->applierId;
        
          std::shared_ptr<Worklet> workletPtr = starter.lock()->worklet;

          std::vector<int> svIds;
          std::string id = "id";
          for (int svId : starter.lock()->args) {
            svIds.push_back(svId);
          }
          
          std::vector<std::shared_ptr<SharedValue>> sharedValues;
          
          for (auto id : svIds) {
            std::shared_ptr<SharedValue> sv = sharedValueRegistry.lock()->getSharedValue(id);
            if (sv == nullptr) {
              return -1;
            }
            sharedValues.push_back(sv);
          }
          
          for (int i = 0; i < count; ++i) {
            jsi::Function assign = rt.global().getPropertyAsObject(rt, "Reanimated").getPropertyAsFunction(rt, "assign");
            assign.call(rt, sharedValues[i]->asParameter(rt, sharedValues[i]), args[i]);
          }

          std::shared_ptr<Applier> applier(new Applier(applierId, workletPtr, sharedValues, sharedValueRegistry.lock()));
          
          // remove previous instance
          applierRegistry.lock()->unregisterApplierFromRender(applierId, rt);
          applierRegistry.lock()->registerApplierForRender(applierId, applier);

          return this->starter.lock()->applierId;
        };
        return jsi::Function::createFromHostFunction(rt, name, starter.lock()->args.size(), callback);
        
      } else if (propName == "stop") {
        auto callback = [this](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count
        ) -> jsi::Value {
          applierRegistry.lock()->unregisterApplierFromRender(starter.lock()->applierId, rt);
          return jsi::Value::undefined();
        };
        return jsi::Function::createFromHostFunction(rt, name, 0, callback);
        
      } else if (propName == "startTentatively") {
        auto callback = [this](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count
        ) -> jsi::Value {
          return jsi::Value(startTentatively(rt, args, count));
        };
        return jsi::Function::createFromHostFunction(rt, name, starter.lock()->args.size(), callback);
      }
      return jsi::Value::undefined();
    }

  };

  std::shared_ptr<jsi::HostObject> ptr(new HO(
      id,
      std::dynamic_pointer_cast<SharedWorkletStarter>(sv),
      this->sharedValueRegistry,
      this->applierRegistry));

  this->parameter = jsi::Object::createFromHostObject(rt, ptr);
  return parameter.getObject(rt);
}

void SharedWorkletStarter::willUnregister(jsi::Runtime &rt) {
  // unregister applier
  // it's important [Do not remove]    
  applierRegistry.lock()->unregisterApplierFromRender(applierId, rt);
}

std::shared_ptr<SharedValue> SharedWorkletStarter::copy() {
  
  int id = SharedValueRegistry::NEXT_SHARED_VALUE_ID--;
  return std::make_shared<SharedWorkletStarter>(id,
                                        worklet,
                                        args,
                                        sharedValueRegistry.lock(),
                                        applierRegistry.lock());
}

std::vector<int> SharedWorkletStarter::getSharedValues() {
  std::vector<int> res;
  res.push_back(id);
  return res;
}


