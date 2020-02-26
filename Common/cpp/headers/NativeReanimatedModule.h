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
#include "ListenerRegistry.h"

#include <unistd.h>

namespace facebook {
namespace react {

class NativeReanimatedModule : public NativeReanimatedModuleSpec {
  std::shared_ptr<Scheduler> scheduler;

  public:
    NativeReanimatedModule(
      std::unique_ptr<jsi::Runtime> rt,
      std::shared_ptr<ApplierRegistry> ar,
      std::shared_ptr<SharedValueRegistry> svr,
      std::shared_ptr<WorkletRegistry> wr,
      std::shared_ptr<Scheduler> scheduler,
      std::shared_ptr<JSCallInvoker> jsInvoker,
      std::shared_ptr<ListenerRegistry> listenerRegistry);
    void registerWorklet(jsi::Runtime &rt, double id, std::string functionAsString) override;
    void unregisterWorklet(jsi::Runtime &rt, double id) override;
    void addWorkletListener(jsi::Runtime &rt, std::string message, const jsi::Function &callback) override;

    void registerSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) override;
    void unregisterSharedValue(jsi::Runtime &rt, double id) override;
    void getSharedValueAsync(jsi::Runtime &rt, double id, const jsi::Function &callback) override;
    void setSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) override;

    void registerApplierOnRender(jsi::Runtime &rt, int id, int workletId, std::vector<int> svIds) override;
    void unregisterApplierFromRender(jsi::Runtime &rt, int id) override;
    void registerApplierOnEvent(jsi::Runtime &rt, int id, std::string eventName, int workletId, std::vector<int> svIds) override;
    void unregisterApplierFromEvent(jsi::Runtime &rt, int id) override;

    void render();
    void onEvent(std::string eventName, std::string eventAsString);

    void call(jsi::Runtime &rt, const jsi::Function &callback) override;

    std::shared_ptr<WorkletRegistry> workletRegistry;
    std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
    std::shared_ptr<ApplierRegistry> applierRegistry;
    std::shared_ptr<ListenerRegistry> listenerRegistry;
    std::unique_ptr<jsi::Runtime> runtime;
};

}
}
#endif //REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H
