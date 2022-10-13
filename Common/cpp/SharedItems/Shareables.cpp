#include "Shareables.h"

using namespace facebook;
using namespace reanimated;

CoreFunction::CoreFunction(JSRuntimeHelper *_runtimeHelper, const jsi::Value &workletObject)
: runtimeHelper(_runtimeHelper) {
jsi::Runtime &rt = *_runtimeHelper->rnRuntime;
rnFunction = std::make_shared<jsi::Function>(
  workletObject.asObject(rt).asFunction(rt));
functionBody = workletObject.asObject(rt)
                 .getProperty(rt, "asString")
                 .asString(rt)
                 .utf8(rt);
}

jsi::Value CoreFunction::call(jsi::Runtime &rt, const jsi::Value &arg0) {
  if (runtimeHelper->isUIRuntime(rt)) {
    if (uiFunction == nullptr) {
      // maybe need to initialize UI Function
      auto codeBuffer =
          std::make_shared<const jsi::StringBuffer>("(" + functionBody + ")");
      uiFunction = std::make_shared<jsi::Function>(
          rt.evaluateJavaScript(codeBuffer, "__TODO")
              .asObject(rt)
              .asFunction(rt));
    }
    return uiFunction->call(rt, arg0);
  } else {
    // running on the main RN runtime
    return rnFunction->call(rt, arg0);
  }
}

std::shared_ptr<Shareable> extractShareableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &maybeShareableValue) {
  if (maybeShareableValue.isObject()) {
    auto object = maybeShareableValue.asObject(rt);
    if (object.isHostObject<ShareableReactiveHostObject>(rt)) {
      return object.getHostObject<ShareableReactiveHostObject>(rt)->shareable;
    } else if (object.isHostObject<ShareableJSRef>(rt)) {
      return object.getHostObject<ShareableJSRef>(rt)->value;
    }
  }
  throw std::string("value is not shareable");
}

jsi::Value RetainingShareable::getJSValue(jsi::Runtime &rt) {
  jsi::Value value;
  if (&rt == hostRuntime) {
    // TODO: it is suboptimal to generate new object every time getJS is called on host runtime – the
    // object we are generating already exists and we should possibly just grab a hold of that object
    // and use it here instead of creating a new JS representation.
    // As far as I understand the only caase where this can be realistically called this way is when
    // a shared value is created and then accessed on the same runtime
    return toJSValue(rt);
  } else if (remoteValue == nullptr || (value = remoteValue->lock(rt)).isUndefined()) {
    value = toJSValue(rt);
    remoteValue = std::make_shared<jsi::WeakObject>(rt, value.asObject(rt));
  }
  return value;
}

void ShareableReactive::setReactiveValue(jsi::Runtime &rt, const jsi::Value &newValue, const std::shared_ptr<JSRuntimeHelper> &rtHelper) {
  value = extractShareableOrThrow(rt, newValue);

  // notify listeners
  std::shared_ptr<ShareableReactive> thiz = shared_from_this();
  auto notifyListeners = [thiz]() {
    for (auto listener : thiz->listeners) {
      listener.second();
    }
  };
  if (rtHelper->isUIRuntime(rt)) {
    notifyListeners();
  } else {
    rtHelper->scheduleOnUI([notifyListeners] { notifyListeners(); });
  }
}
