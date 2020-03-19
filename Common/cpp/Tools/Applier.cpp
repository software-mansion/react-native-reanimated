//
// Created by Szymon Kapala on 2020-02-12.
//

#include "Applier.h"
#include <string>
#include "Logger.h"
#include <thread>

Applier::Applier(
      int applierId,
      std::shared_ptr<Worklet> worklet,
      std::vector<int> sharedValueIds,
      std::shared_ptr<ErrorHandler> errorHandler,
      std::shared_ptr<SharedValueRegistry> sharedValueRegistry
      ) {
  this->worklet = worklet;
  this->sharedValueIds = sharedValueIds;
  this->applierId = applierId;
  this->errorHandler = errorHandler;
  this->sharedValueRegistry = sharedValueRegistry;
}

Applier::~Applier() {}

bool Applier::apply(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module) {
  bool shouldFinish = false;
  std::vector<std::shared_ptr<SharedValue>> sharedValues;
  
  for (auto id : sharedValueIds) {
    std::shared_ptr<SharedValue> sv = sharedValueRegistry->getSharedValue(id);
    if (sv == nullptr) {
      shouldFinish = true;
      break;
    }
    sharedValues.push_back(sv);
  }
  
  if (!shouldFinish) {
    jsi::Value * args = new jsi::Value[sharedValues.size()];
    for (int i = 0; i < sharedValues.size(); ++i) {
      args[i] = jsi::Value(rt, sharedValues[i]->asParameter(rt));
    }

    module->setWorkletId(worklet->workletId);
    module->setApplierId(applierId);

    try {
      jsi::Value returnValue = worklet->body->callWithThis(rt,
                                jsi::Object::createFromHostObject(rt, module),
                                static_cast<const jsi::Value*>(args),
                                (size_t)sharedValues.size());
      shouldFinish = (returnValue.isBool()) ? returnValue.getBool() : false;
    } catch(const std::exception &e) {
      std::string message = "worklet error: ";
      message += e.what();
      this->errorHandler->raise(message.c_str());
    }
    delete [] args;
  }

  if (shouldFinish) {
    finish();
  }
  
  return shouldFinish;
}

void Applier::addOnFinishListener(const std::function<void()> &listener) {
  onFinishListeners.push_back(listener);
}

void Applier::finish() {
  while (onFinishListeners.size() > 0) {
    onFinishListeners.back()();
    onFinishListeners.pop_back();
  }
}

