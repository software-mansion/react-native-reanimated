#include "Shareables.h"

#include <iostream>

using namespace facebook;

namespace reanimated {

CoreFunction::CoreFunction(
    JSRuntimeHelper *runtimeHelper,
    const jsi::Value &workletValue)
    : runtimeHelper_(runtimeHelper) {
  jsi::Runtime &rt = *runtimeHelper->rnRuntime();
  auto workletObject = workletValue.asObject(rt);
  rnFunction_ = std::make_unique<jsi::Function>(workletObject.asFunction(rt));
  functionBody_ = workletObject.getPropertyAsObject(rt, "__initData")
                      .getProperty(rt, "code")
                      .asString(rt)
                      .utf8(rt);
  location_ = "worklet_" +
      std::to_string(static_cast<uint64_t>(
          workletObject.getProperty(rt, "__workletHash").getNumber()));
}

std::unique_ptr<jsi::Function> &CoreFunction::getFunction(jsi::Runtime &rt) {
  //  std::cerr << functionBody_ << std::endl;
  if (runtimeHelper_->isRNRuntime(rt)) {
    // running on the main RN runtime
    return rnFunction_;
  } else {
    auto name = "__reanimatedCoreFunction_" + location_;
    if (rt.global().getProperty(rt, name.c_str()).isUndefined()) {
      auto codeBuffer = std::make_shared<const jsi::StringBuffer>(
          "(" + functionBody_ + "\n)");
      rt.global().setProperty(
          rt,
          name.c_str(),
          rt.evaluateJavaScript(codeBuffer, location_)
              .asObject(rt)
              .asFunction(rt));
    }
    uiFunction_ = std::make_unique<jsi::Function>(
        rt.global().getPropertyAsFunction(rt, name.c_str()));
    return uiFunction_;
    // TODO: don't use uiFunction_
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

ShareableArray::ShareableArray(jsi::Runtime &rt, const jsi::Array &array)
    : Shareable(ArrayType) {
  auto size = array.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    data_.push_back(extractShareableOrThrow(rt, array.getValueAtIndex(rt, i)));
  }
}

ShareableObject::ShareableObject(jsi::Runtime &rt, const jsi::Object &object)
    : Shareable(ObjectType) {
  auto propertyNames = object.getPropertyNames(rt);
  auto size = propertyNames.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    auto key = propertyNames.getValueAtIndex(rt, i).asString(rt);
    auto keycpp = key.utf8(rt);
    auto value = extractShareableOrThrow(rt, object.getProperty(rt, key));
    data_.emplace_back(keycpp, value);
  }
}

std::shared_ptr<Shareable> Shareable::undefined() {
  static auto undefined = std::make_shared<ShareableScalar>();
  return undefined;
}

jsi::Value ShareableWorklet::toJSValue(jsi::Runtime &rt) {
  jsi::Value obj = ShareableObject::toJSValue(rt);
  assert(this->data_.size() > 0); // worklet needs to have `__workletHash`
  assert(runtimeHelper_->valueUnpacker != nullptr);
  return runtimeHelper_->valueUnpacker->call(rt, obj);
}

jsi::Value ShareableObject::toJSValue(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
  for (size_t i = 0, size = data_.size(); i < size; i++) {
    obj.setProperty(
        rt, data_[i].first.c_str(), data_[i].second->getJSValue(rt));
  }
  return obj;
}

ShareableWorklet::ShareableWorklet(
    const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
    jsi::Runtime &rt,
    const jsi::Object &worklet)
    : ShareableObject(rt, worklet), runtimeHelper_(runtimeHelper) {
  assert(runtimeHelper != nullptr);
  assert(
      this->data_.size() >
      0); // a worklet needs to have at least `__workletHash`
  valueType_ = WorkletType;
}

} /* namespace reanimated */
