#include "MutableValue.h"
#include "MutableSet.h"
#include "SharedParent.h"
#include "ShareableValue.h"
#include "NativeReanimatedModule.h"

namespace reanimated {

void MutableSet::setValue(jsi::Runtime &rt, const jsi::Value &newValue) {
  std::lock_guard<std::mutex> lock(readWriteMutex);
  value = ShareableValue::adapt(rt, newValue, module);
}

jsi::Value MutableSet::getValue(jsi::Runtime &rt) {
  std::lock_guard<std::mutex> lock(readWriteMutex);
  return value->getValue(rt);
}

void MutableSet::set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &newValue) {
  auto propName = name.utf8(rt);
  if (propName == "setItems") {
    //todo
  }
}

jsi::Value MutableSet::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
  auto propName = name.utf8(rt);
  if (propName == "setItems") {
    jsi::Array array(rt, setItems.size());
    int index = 0;
    std::set<std::shared_ptr<ShareableValue>>::iterator it = setItems.begin();
    while (it != setItems.end()) {
      array.setValueAtIndex(rt, index, (*it)->getValue(rt));
      index++; it++;
    }
    return array;
  }
  else if (propName == "add") {
    return jsi::Function::createFromHostFunction(rt, name, 1,
        [&module = module, &setItems = setItems]
        (facebook::jsi::Runtime &rt,
         const facebook::jsi::Value &thisVal,
         const facebook::jsi::Value *args,
         size_t count
        ) {
          std::shared_ptr<ShareableValue> newItem = ShareableValue::adapt(rt, std::move(args[0]), module);
          setItems.insert(newItem);
          return jsi::Value::null();
        }
    );
  }
  else if (propName == "clear") {
    return getValue(rt);
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

MutableSet::MutableSet(jsi::Runtime &rt, const jsi::Value &initial, NativeReanimatedModule *module, std::shared_ptr<Scheduler> s):
StoreUser(s), module(module), value(ShareableValue::adapt(rt, initial, module)) {
}

}
