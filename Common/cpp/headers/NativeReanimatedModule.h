#ifndef REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H
#define REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H

#include <memory>

#include "NativeReanimatedModuleSpec.h"
#include "UIScheduler.h"

#include <unistd.h>

namespace facebook {
namespace react {

class NativeReanimatedModule : public NativeReanimatedModuleSpec {
  std::shared_ptr<UIScheduler> uiScheduler;
  public:
    NativeReanimatedModule(std::shared_ptr<UIScheduler> uiScheduler, std::shared_ptr<JSCallInvoker> jsInvoker);
    jsi::String getString(jsi::Runtime &rt, const jsi::String &arg) override;
    void call(
          jsi::Runtime &rt,
          const jsi::Function &callback) override;
};

}
}
#endif //REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H
