#pragma once

#include <WorkletsExampleSpecJSI.h>

namespace facebook::react {

class NativeExample : public NativeExampleCxxSpec<NativeExample> {
 public:
  explicit NativeExample(std::shared_ptr<CallInvoker> jsInvoker) : NativeExampleCxxSpec(std::move(jsInvoker)) {}

  bool install(jsi::Runtime &rt, jsi::Object runtime);
};

} // namespace facebook::react
