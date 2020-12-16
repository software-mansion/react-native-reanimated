#include "MutableValue.h"
#include "MutableSet.h"
#include "SharedParent.h"
#include "ShareableValue.h"
#include "NativeReanimatedModule.h"

namespace reanimated {

void MutableSet::set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &newValue) {
  std::lock_guard<std::mutex> lock(readWriteMutex);
  auto propName = name.utf8(rt);
  if (propName == "setItems") {
    setItems.clear();
    init(rt, newValue);
  }
}

jsi::Value MutableSet::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
  auto propName = name.utf8(rt);
  if (propName == "setItems") {
    std::lock_guard<std::mutex> lock(readWriteMutex);
    jsi::Array array(rt, setItems.size());
    int index = 0;
    std::set<std::shared_ptr<ShareableValue>>::iterator it = setItems.begin();
    while (it != setItems.end()) {
      array.setValueAtIndex(rt, index++, (*it++)->getValue(rt));
    }
    return array;
  }
  else if (propName == "add") {
    return jsi::Function::createFromHostFunction(rt, name, 1,
      [&module = module, &setItems = setItems, &readWriteMutex = readWriteMutex]
      (facebook::jsi::Runtime &rt,
       const facebook::jsi::Value &thisVal,
       const facebook::jsi::Value *args,
       size_t count
      ) {
        std::lock_guard<std::mutex> lock(readWriteMutex);
        setItems.insert(ShareableValue::adapt(rt, std::move(args[0]), module));
        return jsi::Value::undefined();
      }
    );
  }
  else if (propName == "clear") {
    return jsi::Function::createFromHostFunction(rt, name, 0,
      [&setItems = setItems]
      (facebook::jsi::Runtime &rt,
       const facebook::jsi::Value &thisVal,
       const facebook::jsi::Value *args,
       size_t count
      ) {
        setItems.clear();
        return jsi::Value::undefined();
      }
    );
  }
  else if (propName == "__mutableSet") {
    return jsi::Value(true);
  }

  return jsi::Value::undefined();
}

std::vector<jsi::PropNameID> MutableSet::getPropertyNames(jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> result;
  result.push_back(jsi::PropNameID::forUtf8(rt, std::string("__mutableSet")));
  result.push_back(jsi::PropNameID::forUtf8(rt, std::string("setItems")));
  result.push_back(jsi::PropNameID::forUtf8(rt, std::string("add")));
  result.push_back(jsi::PropNameID::forUtf8(rt, std::string("clear")));
  return result;
}

void MutableSet::init(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isUndefined()) return;
  if (value.isObject()) {
    auto object = value.asObject(rt);
    if (object.isArray(rt)) {
      auto array = object.asArray(rt);
      for (size_t i = 0, size = array.size(rt); i < size; i++) {
        setItems.insert(ShareableValue::adapt(rt, array.getValueAtIndex(rt, i), module));
      }
    }
    else {
      setItems.insert(ShareableValue::adapt(rt, value, module));
    }
  }
  else {
    setItems.insert(ShareableValue::adapt(rt, value, module));
  }
}

MutableSet::MutableSet(
  jsi::Runtime &rt,
  const jsi::Value &initial,
  NativeReanimatedModule *module,
  std::shared_ptr<Scheduler> s
) :
  StoreUser(s),
  module(module) {
    init(rt, initial);
}

}
