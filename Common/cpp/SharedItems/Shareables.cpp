#include "Shareables.h"

using namespace facebook;

namespace reanimated {

jsi::Function getValueUnpacker(jsi::Runtime &rt) {
  auto valueUnpacker = rt.global().getProperty(rt, "__valueUnpacker");
  assert(valueUnpacker.isObject());
  return valueUnpacker.asObject(rt).asFunction(rt);
}

#ifdef DEBUG

static const auto callGuardLambda = [](facebook::jsi::Runtime &rt,
                                       const facebook::jsi::Value &thisVal,
                                       const facebook::jsi::Value *args,
                                       size_t count) {
  try {
    return args[0].asObject(rt).asFunction(rt).call(rt, args + 1, count - 1);
  } catch (std::exception &e) {
    assert(false);
  }
};

jsi::Function getCallGuard(jsi::Runtime &rt) {
  auto callGuard = rt.global().getProperty(rt, "__callGuardDEV");
  if (callGuard.isObject()) {
    // use JS-based implementation if available
    return callGuard.asObject(rt).asFunction(rt);
  }
  // fallback to C++ JSI implementation
  // this is necessary to install __callGuardDEV itself
  return jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "callGuard"), 1, callGuardLambda);
}

#endif // DEBUG

jsi::Value makeShareableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote) {
  std::shared_ptr<Shareable> shareable;
  if (value.isObject()) {
    auto object = value.asObject(rt);
    if (!object.getProperty(rt, "__workletHash").isUndefined()) {
      shareable = std::make_shared<ShareableWorklet>(rt, object);
    } else if (!object.getProperty(rt, "__init").isUndefined()) {
      shareable = std::make_shared<ShareableHandle>(rt, object);
    } else if (object.isFunction(rt)) {
      auto function = object.asFunction(rt);
      if (function.isHostFunction(rt)) {
        shareable =
            std::make_shared<ShareableHostFunction>(rt, std::move(function));
      } else {
        shareable =
            std::make_shared<ShareableRemoteFunction>(rt, std::move(function));
      }
    } else if (object.isArray(rt)) {
      if (shouldRetainRemote.isBool() && shouldRetainRemote.getBool()) {
        shareable = std::make_shared<RetainingShareable<ShareableArray>>(
            rt, object.asArray(rt));
      } else {
        shareable = std::make_shared<ShareableArray>(rt, object.asArray(rt));
      }
    } else if (object.isHostObject(rt)) {
      shareable =
          std::make_shared<ShareableHostObject>(rt, object.getHostObject(rt));
    } else {
      if (shouldRetainRemote.isBool() && shouldRetainRemote.getBool()) {
        shareable =
            std::make_shared<RetainingShareable<ShareableObject>>(rt, object);
      } else {
        shareable = std::make_shared<ShareableObject>(rt, object);
      }
    }
  } else if (value.isString()) {
    shareable = std::make_shared<ShareableString>(value.asString(rt).utf8(rt));
  } else if (value.isUndefined()) {
    shareable = std::make_shared<ShareableScalar>();
  } else if (value.isNull()) {
    shareable = std::make_shared<ShareableScalar>(nullptr);
  } else if (value.isBool()) {
    shareable = std::make_shared<ShareableScalar>(value.getBool());
  } else if (value.isNumber()) {
    shareable = std::make_shared<ShareableScalar>(value.getNumber());
  } else if (value.isSymbol()) {
    // TODO: this is only a placeholder implementation, here we replace symbols
    // with strings in order to make certain objects to be captured. There isn't
    // yet any usecase for using symbols on the UI runtime so it is fine to keep
    // it like this for now.
    shareable =
        std::make_shared<ShareableString>(value.getSymbol(rt).toString(rt));
  } else {
    throw std::runtime_error("attempted to convert an unsupported value type");
  }
  return ShareableJSRef::newHostObject(rt, shareable);
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
    auto value = extractShareableOrThrow(rt, object.getProperty(rt, key));
    data_.emplace_back(key.utf8(rt), value);
  }
}

std::shared_ptr<Shareable> Shareable::undefined() {
  static auto undefined = std::make_shared<ShareableScalar>();
  return undefined;
}

} /* namespace reanimated */
