#include "RemoteObject.h"
#include "SharedParent.h"
#include "NativeReanimatedModule.h"
#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated {

jsi::Value RemoteObject::returnObject(jsi::Runtime &rt) {
    jsi::Value res = initializer->shallowClone(rt);
    return res;
}

}
