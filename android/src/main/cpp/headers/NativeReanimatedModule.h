#ifndef REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H
#define REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H

#include <memory>

#include "NativeReanimatedModuleSpec.h"

#include <android/looper.h>
#include <unistd.h>

namespace facebook {
namespace react {

class NativeReanimatedModule : public NativeReanimatedModuleSpec {
  ALooper *looper;
  public:
    NativeReanimatedModule();
    NativeReanimatedModule(ALooper *looper);
    jsi::String getString(jsi::Runtime &rt, const jsi::String &arg) override;
    void call(
          jsi::Runtime &rt,
          const jsi::Function &callback) override;
};

}
}
#endif //REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULE_H
