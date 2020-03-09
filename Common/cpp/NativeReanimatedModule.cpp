#include "NativeReanimatedModule.h"
#include <memory>
#include "Logger.h"
#include <functional>

using namespace facebook;

namespace facebook {
namespace react {

jsi::Value eval(jsi::Runtime &rt, const char *code) {
  return rt.global().getPropertyAsFunction(rt, "eval").call(rt, code);
}

jsi::Function function(jsi::Runtime &rt, const std::string& code) {
  return eval(rt, ("(" + code + ")").c_str()).getObject(rt).getFunction(rt);
}

NativeReanimatedModule::NativeReanimatedModule(
  std::unique_ptr<jsi::Runtime> rt,
  std::shared_ptr<ApplierRegistry> ar,
  std::shared_ptr<SharedValueRegistry> svr,
  std::shared_ptr<WorkletRegistry> wr,
  std::shared_ptr<Scheduler> scheduler,
  std::shared_ptr<JSCallInvoker> jsInvoker) : NativeReanimatedModuleSpec(jsInvoker) {

  this->applierRegistry = ar;
  this->scheduler = scheduler;
  this->workletRegistry = wr;
  this->sharedValueRegistry = svr;
  this->runtime = std::move(rt);
}

// worklets

void NativeReanimatedModule::registerWorklet( // make it async !!!
  jsi::Runtime &rt,
  double id,
  std::string functionAsString) {
    scheduler->scheduleOnUI([functionAsString, id, this]() mutable {
    auto fun = function(*runtime, functionAsString.c_str());
    std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));
    this->workletRegistry->registerWorklet((int)id, funPtr);
  });
}

void NativeReanimatedModule::unregisterWorklet( // make it async !!!
  jsi::Runtime &rt,
  double id) {
  scheduler->scheduleOnUI([id, this]() mutable {
    this->workletRegistry->unregisterWorklet((int)id);
  });
}


void NativeReanimatedModule::setWorkletListener(jsi::Runtime &rt, int workletId, const jsi::Value &listener) {
  if (listener.isUndefined() or listener.isNull()) {
    scheduler->scheduleOnUI([this, workletId](){
      workletRegistry->setWorkletListener(workletId, std::shared_ptr<std::function<void()>>(nullptr));
    });
    return;
  }

  jsi::Function fun = listener.getObject(rt).asFunction(rt);
  std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));

  std::shared_ptr<std::function<void()>> wrapperFun(new std::function<void()>([this, &rt, funPtr]{
    scheduler->scheduleOnJS([&rt, funPtr]{
      funPtr->call(rt);
    });
  }));
  
  scheduler->scheduleOnUI([this, workletId, wrapperFun](){
    workletRegistry->setWorkletListener(workletId, wrapperFun);
  });
}

// SharedValue

void NativeReanimatedModule::registerSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) {
  if (value.isNumber()) {
    std::shared_ptr<SharedValue> sv(new SharedDouble(id, value.getNumber()));
    scheduler->scheduleOnUI([=](){
      sharedValueRegistry->registerSharedValue(id, sv);
    });
  } else if(value.isString()) {
    std::shared_ptr<SharedValue> sv(new SharedString(id, value.getString(rt).utf8(rt)));
    scheduler->scheduleOnUI([=](){
      sharedValueRegistry->registerSharedValue(id, sv);
    });
  } else if(value.isObject()) {
    jsi::Object obj = value.getObject(rt);
    
    if (obj.hasProperty(rt, "isWorklet")) {
      int workletId = obj.getProperty(rt, "workletId").getNumber();
      
      std::vector<int> args;
      jsi::Array ar = obj.getProperty(rt, "argIds").getObject(rt).asArray(rt);
      for (int i = 0; i < ar.length(rt); ++i) {
        int svId = ar.getValueAtIndex(rt, i).getNumber();
        args.push_back(svId);
      }
      
      std::shared_ptr<SharedWorkletStarter> sv(new SharedWorkletStarter((int)id, workletId, args));
      scheduler->scheduleOnUI([=](){
        sharedValueRegistry->registerSharedValue(id, sv);
      });
    }
  } // add here other types
}

void NativeReanimatedModule::unregisterSharedValue(jsi::Runtime &rt, double id) {
  scheduler->scheduleOnUI([=](){
    sharedValueRegistry->unregisterSharedValue(id);
  });
}

void NativeReanimatedModule::getSharedValueAsync(jsi::Runtime &rt, double id, const jsi::Value &value) {
  jsi::Function fun = value.getObject(rt).asFunction(rt);
  std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));

  scheduler->scheduleOnUI([&rt, id, funPtr, this]() {
    auto sv = sharedValueRegistry->getSharedValue(id);
    scheduler->scheduleOnJS([&rt, sv, funPtr] () {
      jsi::Value val = sv->asValue(rt);
      funPtr->call(rt, val);
    });
  });

}

void NativeReanimatedModule::setSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) {
  if (value.isNumber()) {
    std::shared_ptr<SharedValue> sv(new SharedDouble(id, value.getNumber()));
    scheduler->scheduleOnUI([=](){
      std::shared_ptr<SharedValue> oldSV = sharedValueRegistry->getSharedValue(id);
      oldSV->setNewValue(sv);
    });
  } else if(value.isString()) {
    std::shared_ptr<SharedValue> sv(new SharedString(id, value.getString(rt).utf8(rt)));
    scheduler->scheduleOnUI([=](){
       std::shared_ptr<SharedValue> oldSV = sharedValueRegistry->getSharedValue(id);
       oldSV->setNewValue(sv);
    });
  } // add here other types
}

void NativeReanimatedModule::registerApplierOnRender(jsi::Runtime &rt, int id, int workletId, std::vector<int> svIds) {
  scheduler->scheduleOnUI([=]() {
    std::shared_ptr<Worklet> workletPtr = workletRegistry->getWorklet(workletId);
    std::vector<std::shared_ptr<SharedValue>> svs;
    for (auto &i : svIds) {
      std::shared_ptr<SharedValue> sv = sharedValueRegistry->getSharedValue(i);
      svs.push_back(sv);
    }

    std::shared_ptr<Applier> applier(new Applier(id, workletPtr, svs));
    applierRegistry->registerApplierForRender(id, applier);
  });
}

void NativeReanimatedModule::unregisterApplierFromRender(jsi::Runtime &rt, int id) {
  scheduler->scheduleOnUI([=](){
    applierRegistry->unregisterApplierFromRender(id);
  });
}

void NativeReanimatedModule::registerApplierOnEvent(jsi::Runtime &rt, int id, std::string eventName, int workletId, std::vector<int> svIds) {
  scheduler->scheduleOnUI([=]() {
    std::shared_ptr<Worklet> workletPtr = workletRegistry->getWorklet(workletId);
    std::vector<std::shared_ptr<SharedValue>> svs;
    for (auto &i : svIds) {
      std::shared_ptr<SharedValue> sv = sharedValueRegistry->getSharedValue(i);
      svs.push_back(sv);
    }

    std::shared_ptr<Applier> applier(new Applier(id, workletPtr, svs));
    applierRegistry->registerApplierForEvent(id, eventName, applier);
   });
}

void NativeReanimatedModule::unregisterApplierFromEvent(jsi::Runtime &rt, int id) {
  scheduler->scheduleOnUI([=](){
    applierRegistry->unregisterApplierFromEvent(id);
  });
}

void NativeReanimatedModule::render() {
  std::shared_ptr<jsi::Value> event(new jsi::Value(*runtime, jsi::Value::undefined()));
  std::shared_ptr<BaseWorkletModule> ho(new WorkletModule(
    sharedValueRegistry, 
    applierRegistry, 
    workletRegistry,
    event));
  applierRegistry->render(*runtime, ho);
}

void NativeReanimatedModule::onEvent(std::string eventName, std::string eventAsString) {
  jsi::Value event = eval(*runtime, ("(" + eventAsString + ")").c_str());
  std::shared_ptr<jsi::Value> eventPtr(new jsi::Value(*runtime, event));
  std::shared_ptr<BaseWorkletModule> ho(new WorkletModule(
    sharedValueRegistry, 
    applierRegistry, 
    workletRegistry,
    eventPtr));
  applierRegistry->event(*runtime, eventName, ho);
}

NativeReanimatedModule::~NativeReanimatedModule() {
  // noop
}

// test method

/*
  used for tests
*/
void NativeReanimatedModule::getRegistersState(jsi::Runtime &rt, int option, const jsi::Value &value) {
  // option:
  //  1 - shared values
  //  2 - worklets
  //  3 - appliers
  jsi::Function fun = value.getObject(rt).asFunction(rt);
  std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));

  scheduler->scheduleOnUI([&rt, funPtr, this, option]() {
    std::string ids;
    switch(option) {
      case 1: {
        for(auto &it : sharedValueRegistry->getSharedValueMap()) {
          ids += std::to_string(it.first) + " ";
        }
        break;
      }
      case 2: {
        for(auto it : workletRegistry->getWorkletMap()) {
          ids += std::to_string(it.first) + " ";
        }
        break;
      }
      case 3: {
        for(auto &it : applierRegistry->getRenderAppliers()) {
          ids += std::to_string(it.first) + " ";
        }
        for(auto &it : applierRegistry->getEventMapping()) {
          ids += std::to_string(it.first) + " ";
        }
        break;
      }
      default: {
        ids = "error: registers state invalid option provided ";
      }
    }
    if (ids.size() > 0) {
      ids.pop_back();
    }
    scheduler->scheduleOnJS([&rt, ids, funPtr] () {
      funPtr->call(rt, ids.c_str());
    });
  });
}

}
}
