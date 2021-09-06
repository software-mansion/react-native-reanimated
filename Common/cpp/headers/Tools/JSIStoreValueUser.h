#ifndef JSIStoreValueUser_h
#define JSIStoreValueUser_h

#include <jsi/jsi.h>
#include <stdio.h>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <vector>
#include "Scheduler.h"

using namespace facebook;

namespace reanimated {

class RuntimeManager;

struct StaticStoreUser {
  std::atomic<int> ctr;
  std::unordered_map<int, std::vector<std::shared_ptr<jsi::Value>>> store;
  std::recursive_mutex storeMutex;
};

class StoreUser {
  int identifier = 0;
  std::weak_ptr<Scheduler> scheduler;
  std::shared_ptr<StaticStoreUser> storeUserData;

 public:
  StoreUser(std::shared_ptr<Scheduler> s, RuntimeManager &runtimeManager);

  std::weak_ptr<jsi::Value> getWeakRef(jsi::Runtime &rt);
  void removeRefs();

  virtual ~StoreUser();
};

} // namespace reanimated

#endif /* JSIStoreValueUser_h */
