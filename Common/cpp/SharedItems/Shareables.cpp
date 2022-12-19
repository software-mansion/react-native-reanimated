#include "Shareables.h"

using namespace facebook;

namespace reanimated {

CoreFunction::CoreFunction(
    JSRuntimeHelper *runtimeHelper,
    const jsi::Value &workletValue)
    : runtimeHelper_(runtimeHelper) {
  jsi::Runtime &rt = *runtimeHelper->rnRuntime();
  auto workletObject = workletValue.asObject(rt);
  rnFunction_ = std::make_unique<jsi::Function>(workletObject.asFunction(rt));
  functionBody_ =
      workletObject.getProperty(rt, "asString").asString(rt).utf8(rt);
  location_ = "worklet_" +
      std::to_string(static_cast<unsigned long long>(
          workletObject.getProperty(rt, "__workletHash").getNumber()));
}

std::unique_ptr<jsi::Function> &CoreFunction::getFunction(jsi::Runtime &rt) {
  if (runtimeHelper_->isUIRuntime(rt)) {
    if (uiFunction_ == nullptr) {
      // maybe need to initialize UI Function
      // the newline before closing paren is needed because the last line can be
      // an inline comment (specifically this happens when we attach source maps
      // at the end) in which case the paren won't be parsed
      auto codeBuffer = std::make_shared<const jsi::StringBuffer>(
          "(" + functionBody_ + "\n)");
      uiFunction_ = std::make_unique<jsi::Function>(
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
    const jsi::Value &maybeShareableValue,
    const char *errorMessage) {
  if (maybeShareableValue.isObject()) {
    auto object = maybeShareableValue.asObject(rt);
    if (object.isHostObject<ShareableJSRef>(rt)) {
      return object.getHostObject<ShareableJSRef>(rt)->value();
    }
  } else if (maybeShareableValue.isUndefined()) {
    return Shareable::undefined();
  }
  throw std::runtime_error(
      errorMessage != nullptr
          ? errorMessage
          : "expecting the object to be of type ShareableJSRef");
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
  } else if (remoteValue_ == nullptr) {
    value = toJSValue(rt);
    remoteValue_ = std::make_unique<jsi::WeakObject>(rt, value.asObject(rt));
  } else {
    value = remoteValue_->lock(rt);
    if (value.isUndefined()) {
      value = toJSValue(rt);
      remoteValue_ = std::make_unique<jsi::WeakObject>(rt, value.asObject(rt));
    }
  }
  return value;
}

RetainingShareable::~RetainingShareable() {
  if (runtimeHelper_->uiRuntimeDestroyed) {
    // The below use of unique_ptr.release prevents the smart pointer from
    // calling the destructor of the kept object. This effectively results in
    // leaking some memory. We do this on purpose, as sometimes we would keep
    // references to JSI objects past the lifetime of its runtime (e.g., shared
    // values references from the RN VM holds reference to JSI objects on the
    // UI runtime). When the UI runtime is terminated, the orphaned JSI objects
    // would crash the app when their destructors are called, because they
    // call into a memory that's managed by the terminated runtime. We accept
    // the tradeoff of leaking memory here, as it has a limited impact. This
    // scenario can only occur when the React instance is torn down which
    // happens in development mode during app reloads, or in production when the
    // app is being shut down gracefully by the system. An alternative solution
    // would require us to keep track of all JSI values that are in use which
    // would require additional data structure and compute spent on bookkeeping
    // that only for the sake of destroying the values in time before the
    // runtime is terminated. Note that the underlying memory that jsi::Value
    // refers to is managed by the VM and gets freed along with the runtime.
    remoteValue_.release();
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
