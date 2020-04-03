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
      std::shared_ptr<ApplierRegistry> applierRegistry,
      std::shared_ptr<ErrorHandler> errorHandler) {
  this->id = svId;
  this->worklet = worklet;
  this->args = args;
  this->shouldBeSentToJava = false;
  this->type = SharedValueType::shared_starter;
  this->sharedValueRegistry = sharedValueRegistry;
  this->applierRegistry = applierRegistry;
  this->errorHandler = errorHandler;
  this->applierId = ApplierRegistry::New_Applier_Id--;
}

jsi::Value SharedWorkletStarter::asValue(jsi::Runtime &rt) const {
  return jsi::Value::undefined();
}

void SharedWorkletStarter::setNewValue(std::shared_ptr<SharedValue> sv) {
  // noop
}

SharedWorkletStarter::~SharedWorkletStarter() {
  
}

jsi::Value SharedWorkletStarter::asParameter(jsi::Runtime &rt) {
  
  class HO : public jsi::HostObject {
    public:
    int id;
    std::shared_ptr<SharedWorkletStarter> starter;
    std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
    std::shared_ptr<ApplierRegistry> applierRegistry;
    std::shared_ptr<ErrorHandler> errorHandler;

    HO(int id,
        std::shared_ptr<SharedWorkletStarter> starter,
        std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
        std::shared_ptr<ApplierRegistry> applierRegistry,
        std::shared_ptr<ErrorHandler> errorHandler) {
      this->id = id;
      this->starter = starter;
      this->sharedValueRegistry = sharedValueRegistry;
      this->applierRegistry = applierRegistry;
      this->errorHandler = errorHandler;
    }

    int startTentatively(jsi::Runtime &rt, const jsi::Value *args, int count) {
      std::vector<std::shared_ptr<SharedValue>> sharedValues;
      for (int i = 0; i < starter->worklet->length; ++i) {
        std::shared_ptr<SharedValue> sv;
        if (i < count and args[i].isObject() and args[i].getObject(rt).hasProperty(rt, "id")) {
          int svId = args[i].getObject(rt).getProperty(rt, "id").asNumber();
          sv = sharedValueRegistry->getSharedValue(svId);
          if (sv == nullptr) return -1;
          sharedValues.push_back(sv);
          continue;
        }
        std::shared_ptr<SharedValue> defaultSV = sharedValueRegistry->getSharedValue(starter->args[i]);
        if (defaultSV == nullptr) return -1;
        sv = defaultSV->copy();
        sharedValues.push_back(sv);
        
        if (i < count) {
          jsi::Function assign = rt.global().getPropertyAsObject(rt, "Reanimated").getPropertyAsFunction(rt, "assign");
          assign.call(rt, sv->asParameter(rt), args[i]);
        }
      }
      
      int applierId = ApplierRegistry::New_Applier_Id--;
      std::shared_ptr<Applier> applier(new Applier(applierId, starter->worklet, sharedValues, this->errorHandler, sharedValueRegistry));
      
      applierRegistry->registerApplierForRender(applierId, applier);
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
          int applierId = starter->applierId;
        
          std::shared_ptr<Worklet> workletPtr = starter->worklet;

          std::vector<int> svIds;
          std::string id = "id";
          for (int svId : starter->args) {
            svIds.push_back(svId);
          }
          
          std::vector<std::shared_ptr<SharedValue>> sharedValues;
          
          for (auto id : svIds) {
            std::shared_ptr<SharedValue> sv = sharedValueRegistry->getSharedValue(id);
            if (sv == nullptr) {
              return false;
              break;
            }
            sharedValues.push_back(sv);
          }
          
          for (int i = 0; i < count; ++i) {
            jsi::Function assign = rt.global().getPropertyAsObject(rt, "Reanimated").getPropertyAsFunction(rt, "assign");
            assign.call(rt, sharedValues[i]->asParameter(rt), args[i]);
          }

          std::shared_ptr<Applier> applier(new Applier(applierId, workletPtr, sharedValues, this->errorHandler, sharedValueRegistry));
          
          // remove previous instance
          applierRegistry->unregisterApplierFromRender(applierId, rt);
          
          starter->setUnregisterListener([=, &rt] () {
            applierRegistry->unregisterApplierFromRender(applierId, rt);
          });
        
          applierRegistry->registerApplierForRender(applierId, applier);

          return true;
        };
        return jsi::Function::createFromHostFunction(rt, name, starter->args.size(), callback);
        
      } else if (propName == "stop") {
        auto callback = [this](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count
        ) -> jsi::Value {
          if (starter->unregisterListener != nullptr) {
            (*(starter->unregisterListener))();
            starter->unregisterListener = nullptr;
          }
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
        return jsi::Function::createFromHostFunction(rt, name, starter->args.size(), callback);
      }
      return jsi::Value::undefined();
    }

  };

  std::shared_ptr<jsi::HostObject> ptr(new HO(
      id,
std::dynamic_pointer_cast<SharedWorkletStarter>(sharedValueRegistry->getSharedValue(id)),
      this->sharedValueRegistry,
      this->applierRegistry,
      this->errorHandler));

  return jsi::Object::createFromHostObject(rt, ptr);
}

void SharedWorkletStarter::willUnregister(jsi::Runtime &rt) {
  if (this->unregisterListener != nullptr) {
    (*this->unregisterListener)();
  }
}

void SharedWorkletStarter::setUnregisterListener(const std::function<void()> & fun) {
  if (fun == nullptr) {
    this->unregisterListener = nullptr;
    return;
  }
  this->unregisterListener = std::make_shared<const std::function<void()>>(std::move(fun));
}

std::shared_ptr<SharedValue> SharedWorkletStarter::copy() {
  
  int id = SharedValueRegistry::NEXT_SHARED_VALUE_ID--;
  return std::make_shared<SharedWorkletStarter>(id,
                                        worklet,
                                        args,
                                        sharedValueRegistry,
                                        applierRegistry,
                                        errorHandler);
}

std::vector<int> SharedWorkletStarter::getSharedValues() {
  std::vector<int> res;
  res.push_back(id);
  return res;
}


