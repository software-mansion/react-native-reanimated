//
// Created by Szymon Kapala on 2020-02-13.
//

#include "WorkletModule.h"


WorkletModule::WorkletModule(std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
                                   std::shared_ptr<ApplierRegistry> applierRegistry,
                                   std::shared_ptr<WorkletRegistry> workletRegistry,
                                   std::shared_ptr<jsi::Value> event) {
  this->sharedValueRegistry = sharedValueRegistry;
  this->applierRegistry = applierRegistry;
  this->workletRegistry = workletRegistry;
  this->event = event;
}

jsi::Value WorkletModule::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
  auto propName = name.utf8(rt);
  if (propName == "startWorklet") {
     auto callback = [this](
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        size_t count
        ) -> jsi::Value {

        int newApplierId = WorkletModule::applierId--;

        int workletId = args[0].getNumber();
        std::shared_ptr<jsi::Function> workletPtr = workletRegistry->getWorklet(workletId);

        std::vector<std::shared_ptr<SharedValue>> svs;
        std::string id = "id";
        for (int i = 1; i < count; ++i) {
          int svId = args[i].getObject(rt).getProperty(rt, id.c_str()).getNumber();
          std::shared_ptr<SharedValue> sv = sharedValueRegistry->getSharedValue(svId);
          svs.push_back(sv);
        }

        std::shared_ptr<Applier> applier(new Applier(workletPtr, svs));
        applierRegistry->registerApplierForRender(newApplierId, applier);

        return jsi::Value::undefined();
     };
    return jsi::Function::createFromHostFunction(rt, name, 1, callback);
  } else if (propName == "emit") {
    //TODO
  } else if (propName == "event") {

    return event->getObject(rt).getProperty(rt, "NativeMap");

  } else if (propName == "log") {
    auto callback = [](
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        size_t count
        ) -> jsi::Value {
      const jsi::Value *value = &args[0];
      if (value->isString()) {
        // use logger here
      } else if (value->isNumber()) {
        // use logger here
      } else {
        // use logger here
      }
      return jsi::Value::undefined();
    };
    return jsi::Function::createFromHostFunction(rt, name, 1, callback);
  }

  return jsi::Value::undefined();
}

int WorkletModule::applierId = INT_MAX;
