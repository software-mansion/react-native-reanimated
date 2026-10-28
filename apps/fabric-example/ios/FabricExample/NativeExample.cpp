#include "NativeExample.h"

#include <worklets/WorkletRuntime/WorkletRuntime.h>

namespace jsi = facebook::jsi;

void installNativeAnswer(jsi::Runtime &rnRuntime, const jsi::Value &runtimeValue) {
  auto worker = worklets::extractWorkletRuntime(rnRuntime, runtimeValue);

  worker->runSync([](jsi::Runtime &workerRuntime) {
    workerRuntime.global().setProperty(
        workerRuntime,
        "nativeAnswer",
        jsi::Function::createFromHostFunction(
            workerRuntime,
            jsi::PropNameID::forAscii(workerRuntime, "nativeAnswer"),
            0,
            [](jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) -> jsi::Value {
              return jsi::Value(42);
            }));
  });
}

namespace facebook::react {

bool NativeExample::install(jsi::Runtime &rt, jsi::Object runtime) {
  installNativeAnswer(rt, jsi::Value(rt, runtime));
  return true;
}

} // namespace facebook::react
