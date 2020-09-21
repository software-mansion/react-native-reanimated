#pragma once

#include "SharedParent.h"
#include "FrozenObject.h"

using namespace facebook;

namespace reanimated {

class RemoteObject: public jsi::HostObject {
private:
  std::unique_ptr<FrozenObject> initializer;
public:
  jsi::Value returnObject(jsi::Runtime &rt);
  RemoteObject(jsi::Runtime &rt, jsi::Object &object, NativeReanimatedModule *module):
    initializer(new FrozenObject(rt, object, module)) {}
};

}
