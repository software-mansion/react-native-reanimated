#ifndef REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H
#define REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H

#include <memory>
#include <vector>

#include "NativeReanimatedModuleSpec.h"
#include "Scheduler.h"
#include "WorkletRegistry.h"
#include "SharedValueRegistry.h"
#include "SharedValue.h"
#include "SharedDouble.h"
#include "SharedString.h"
#include "WorkletModule.h"
#include "ApplierRegistry.h"
#include "ErrorHandler.h"
#include "SharedFunction.h"
#include "SharedArray.h"
#include "SharedObject.h"
#include "MapperRegistry.h"

#include <unistd.h>

namespace facebook {
namespace react {

class NativeReanimatedModule : public NativeReanimatedModuleSpec {
    std::shared_ptr<Scheduler> scheduler;
    std::shared_ptr<jsi::Value> dummyEvent;
    std::shared_ptr<BaseWorkletModule> workletModule;

  public:
    NativeReanimatedModule(
      std::unique_ptr<jsi::Runtime> rt,
      std::shared_ptr<ApplierRegistry> ar,
      std::shared_ptr<SharedValueRegistry> svr,
      std::shared_ptr<WorkletRegistry> wr,
      std::shared_ptr<Scheduler> scheduler,
      std::shared_ptr<MapperRegistry> mapperRegistry,
      std::shared_ptr<JSCallInvoker> jsInvoker,
      std::shared_ptr<ErrorHandler> errorHandler);
    virtual ~NativeReanimatedModule();
    void registerWorklet(jsi::Runtime &rt, double id, std::string functionAsString, int length) override;
    void unregisterWorklet(jsi::Runtime &rt, double id) override;
    void setWorkletListener(jsi::Runtime &rt, int workletId, const jsi::Value &listener) override;

    void registerSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) override;
    void unregisterSharedValue(jsi::Runtime &rt, double id) override;
    void getSharedValueAsync(jsi::Runtime &rt, double id, const jsi::Value &value) override;
    void setSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) override;
    void updateSharedValueRegistry(jsi::Runtime &rt, int id, const jsi::Value &value, bool setVal);

    void registerApplierOnRender(jsi::Runtime &rt, int id, int workletId, std::vector<int> svIds) override;
    void unregisterApplierFromRender(jsi::Runtime &rt, int id) override;
    void registerApplierOnEvent(jsi::Runtime &rt, int id, std::string eventName, int workletId, std::vector<int> svIds) override;
    void unregisterApplierFromEvent(jsi::Runtime &rt, int id) override;
  
    virtual void registerMapper(jsi::Runtime &rt, int id, int workletId, std::vector<int> svIds) override;
    virtual void unregisterMapper(jsi::Runtime &rt, int id) override;

    void render();
    void onEvent(std::string eventName, std::string eventAsString);

    std::unique_ptr<jsi::Runtime> runtime;
    std::shared_ptr<WorkletRegistry> workletRegistry;
    std::shared_ptr<MapperRegistry> mapperRegistry;
    std::shared_ptr<ApplierRegistry> applierRegistry;
    std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
    std::shared_ptr<ErrorHandler> errorHandler;
    
    /*
      used for tests
    */
    void getRegistersState(jsi::Runtime &rt, int option, const jsi::Value &value) override;
};

}
}
#endif //REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H
