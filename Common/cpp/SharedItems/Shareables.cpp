#include "Shareables.h"

using namespace facebook;

namespace reanimated {

CoreFunction::CoreFunction(
    JSRuntimeHelper *runtimeHelper,
    const jsi::Value &workletValue)
    : runtimeHelper_(runtimeHelper) {
  jsi::Runtime &rt = *runtimeHelper->rnRuntime();
  auto workletObject = workletValue.asObject(rt);
  rnFunction_ = std::make_shared<jsi::Function>(workletObject.asFunction(rt));
  functionBody_ =
      workletObject.getProperty(rt, "asString").asString(rt).utf8(rt);
  location_ = workletObject.getProperty(rt, "__location").asString(rt).utf8(rt);
}

std::shared_ptr<jsi::Function> CoreFunction::getFunction(jsi::Runtime &rt) {
  if (runtimeHelper_->isUIRuntime(rt)) {
    if (uiFunction_ == nullptr) {
      // maybe need to initialize UI Function
      // the newline before closing paren is needed because the last line can be
      // an inline comment (specifically this happens when we attach source maps
      // at the end) in which case the paren won't be parsed
      auto codeBuffer = std::make_shared<const jsi::StringBuffer>(
          "(" + functionBody_ + "\n)");
      uiFunction_ = std::make_shared<jsi::Function>(
          rt.evaluateJavaScript(codeBuffer, location_)
              .asObject(rt)
              .asFunction(rt));
    }
    return uiFunction_;
  } else {
    // running on the main RN runtime
    return rnFunction_;
  }
}

std::shared_ptr<Shareable> extractShareableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &maybeShareableValue) {
  if (maybeShareableValue.isObject()) {
    auto object = maybeShareableValue.asObject(rt);
    if (object.isHostObject<ShareableJSRef>(rt)) {
      return object.getHostObject<ShareableJSRef>(rt)->value();
    }
  } else if (maybeShareableValue.isUndefined()) {
    return Shareable::undefined();
  }
  throw std::runtime_error("expecting the object to be of type ShareableJSRef");
}

Shareable::~Shareable() {}

#if HAS_JS_WEAK_OBJECTS

jsi::Value RetainingShareable::getJSValue(jsi::Runtime &rt) {
  jsi::Value value;
  if (runtimeHelper_->isRNRuntime(rt)) {
    // TODO: it is suboptimal to generate new object every time getJS is called
    // on host runtime – the objects we are generating already exists and we
    // should possibly just grab a hold of such object and use it here instead
    // of creating a new JS representation. As far as I understand the only
    // case where it can be realistically called this way is when a shared
    // value is created and then accessed on the same runtime
    return toJSValue(rt);
  } else if (remoteValue == nullptr) {
    value = toJSValue(rt);
    remoteValue = new jsi::WeakObject(rt, value.asObject(rt));
  } else {
    value = remoteValue->lock(rt);
    if (value.isUndefined()) {
      value = toJSValue(rt);
      delete remoteValue;
      remoteValue = new jsi::WeakObject(rt, value.asObject(rt));
    }
  }
  return value;
}

RetainingShareable::~RetainingShareable() {
  if (!runtimeHelper_->uiRuntimeDestroyed) {
    delete remoteValue;
  }
}

#endif // HAS_JS_WEAK_OBJECTS

ShareableArray::ShareableArray(
    const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
    jsi::Runtime &rt,
    const jsi::Array &array)
    : RetainingShareable(runtimeHelper, rt, ArrayType) {
  auto size = array.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    data_.push_back(extractShareableOrThrow(rt, array.getValueAtIndex(rt, i)));
  }
}

ShareableObject::ShareableObject(
    const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
    jsi::Runtime &rt,
    const jsi::Object &object)
    : RetainingShareable(runtimeHelper, rt, ObjectType) {
  auto propertyNames = object.getPropertyNames(rt);
  auto size = propertyNames.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    auto key = propertyNames.getValueAtIndex(rt, i).asString(rt);
    auto value = extractShareableOrThrow(rt, object.getProperty(rt, key));
    data_.emplace_back(key.utf8(rt), value);
  }
}

std::shared_ptr<Shareable> Shareable::undefined() {
  static auto undefined = std::make_shared<ShareableScalar>();
  return undefined;
}

} /* namespace reanimated */
