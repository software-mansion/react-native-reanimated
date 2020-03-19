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
    SharedWorkletStarter *starter;
    std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
    std::shared_ptr<ApplierRegistry> applierRegistry;
    std::shared_ptr<ErrorHandler> errorHandler;

    HO(int id,
        SharedWorkletStarter *starter,
        std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
        std::shared_ptr<ApplierRegistry> applierRegistry,
        std::shared_ptr<ErrorHandler> errorHandler) {
      this->id = id;
      this->starter = starter;
      this->sharedValueRegistry = sharedValueRegistry;
      this->applierRegistry = applierRegistry;
      this->errorHandler = errorHandler;
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
          int newApplierId = ApplierRegistry::New_Applier_Id--;
          
          if (starter->unregisterListener != nullptr) {
              return false;
          }
        
          std::shared_ptr<Worklet> workletPtr = starter->worklet;

          std::vector<int> svIds;
          std::string id = "id";
          for (int svId : starter->args) {
            svIds.push_back(svId);
          }

          std::shared_ptr<Applier> applier(new Applier(newApplierId, workletPtr, svIds, this->errorHandler, sharedValueRegistry));
          
          applier->addOnFinishListener([=] {
            starter->setUnregisterListener(nullptr);
          });
          
          starter->setUnregisterListener([=] () {
            applierRegistry->unregisterApplierFromRender(newApplierId);
          });
        
          applierRegistry->registerApplierForRender(newApplierId, applier);

          return true;
        };
        return jsi::Function::createFromHostFunction(rt, name, 0, callback);
      } else if (propName == "stop") {
        auto callback = [this](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count
        ) -> jsi::Value {
          if (starter->unregisterListener != nullptr) {
            (*starter->unregisterListener)();
            starter->unregisterListener = nullptr;
          }
          return jsi::Value::undefined();
        };
        return jsi::Function::createFromHostFunction(rt, name, 0, callback);
      }
      return jsi::Value::undefined();
    }

  };

  std::shared_ptr<jsi::HostObject> ptr(new HO(
      id,
      this,
      this->sharedValueRegistry,
      this->applierRegistry,
      this->errorHandler));

  return jsi::Object::createFromHostObject(rt, ptr);
}

void SharedWorkletStarter::willUnregister() {
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


std::vector<int> SharedWorkletStarter::getSharedValues() {
  std::vector<int> res;
  res.push_back(id);
  return res;
}


