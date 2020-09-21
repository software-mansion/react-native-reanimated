#include "JSIStoreValueUser.h"

namespace reanimated {

int identifier = 0;
std::atomic<int> StoreUser::ctr;
std::unordered_map<int, std::vector<std::shared_ptr<jsi::Value>>> StoreUser::store;

std::weak_ptr<jsi::Value> StoreUser::getWeakRef(jsi::Runtime &rt) {
  if (StoreUser::store.count(identifier) == 0) {
    StoreUser::store[identifier] = std::vector<std::shared_ptr<jsi::Value>>();
  }
  std::shared_ptr<jsi::Value> sv = std::make_shared<jsi::Value>(rt, jsi::Value::undefined());
  StoreUser::store[identifier].push_back(sv);
  
  return sv;
}

void StoreUser::removeRefs() {
  if (StoreUser::store.count(identifier) > 0) {
    StoreUser::store.erase(identifier);
  }
}

StoreUser::~StoreUser() {
  removeRefs();
}


void StoreUser::clearStore() {
  StoreUser::store.clear();
}

}
