#include "JSIStoreValueUser.h"

namespace reanimated {

std::atomic<int> StoreUser::ctr;
std::mutex StoreUser::storeMutex;
std::unordered_map<int, std::vector<std::shared_ptr<jsi::Value>>> StoreUser::store;

std::weak_ptr<jsi::Value> StoreUser::getWeakRef(jsi::Runtime &rt) {
  const std::lock_guard<std::mutex> lock(storeMutex);
  if (StoreUser::store.count(identifier) == 0) {
    StoreUser::store[identifier] = std::vector<std::shared_ptr<jsi::Value>>();
  }
  std::shared_ptr<jsi::Value> sv = std::make_shared<jsi::Value>(rt, jsi::Value::undefined());
  StoreUser::store[identifier].push_back(sv);
  
  return sv;
}

void StoreUser::removeRefs() {
  const std::lock_guard<std::mutex> lock(storeMutex);
  if (StoreUser::store.count(identifier) > 0) {
    StoreUser::store.erase(identifier);
  }
}

StoreUser::~StoreUser() {
  removeRefs();
}


void StoreUser::clearStore() {
  const std::lock_guard<std::mutex> lock(storeMutex);
  StoreUser::store.clear();
}

}
