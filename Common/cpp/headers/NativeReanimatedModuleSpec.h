#ifndef REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULESPEC_H
#define REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULESPEC_H

#include <memory>
#include <string>

#ifdef ONANDROID
  #include "TurboModule.h"
#else
  #include <ReactCommon/TurboModule.h>
#endif

#include <ReactCommon/JSCallInvoker.h>

namespace facebook {
namespace react {

class JSI_EXPORT NativeReanimatedModuleSpec : public TurboModule {
 protected:
  NativeReanimatedModuleSpec(std::shared_ptr<JSCallInvoker> jsInvoker);

 public:
  virtual jsi::String getString(jsi::Runtime &rt, const jsi::String &arg) = 0;
  virtual void call(
        jsi::Runtime &rt,
        const jsi::Function &callback) = 0;
};

} // namespace react
} // namespace facebook

#endif //REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULESPEC_H
