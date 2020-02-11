#ifndef REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H
#define REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H

#include <memory>

#include "NativeReanimatedModuleSpec.h"
#include "Scheduler.h"
#include "WorkletRegistry.h"
#include "SharedValueRegistry.h"
#include "SharedValue.h"
#include "SharedDouble.h"

#include <unistd.h>

namespace facebook {
namespace react {

class NativeReanimatedModule : public NativeReanimatedModuleSpec {
  std::shared_ptr<Scheduler> scheduler;
  std::shared_ptr<WorkletRegistry> workletRegistry;
  std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
  public:
    NativeReanimatedModule(std::shared_ptr<SharedValueRegistry> svr, std::shared_ptr<WorkletRegistry> wr, std::shared_ptr<Scheduler> scheduler, std::shared_ptr<JSCallInvoker> jsInvoker);
    void registerWorklet(jsi::Runtime &rt, double id, const jsi::String &arg) override;
    void unregisterWorklet(jsi::Runtime &rt, double id) override;

    void registerSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) override;
    void unregisterSharedValue(jsi::Runtime &rt, double id) override;
    jsi::Value getSharedValueAsync(jsi::Runtime &rt, double id) override;
    void setSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) override;

    void call(jsi::Runtime &rt, const jsi::Function &callback) override;
};

}
}
#endif //REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H
