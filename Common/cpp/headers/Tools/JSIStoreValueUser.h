#ifndef JSIStoreValueUser_h
#define JSIStoreValueUser_h

#include <stdio.h>
#include <memory>
#include <vector>
#include <unordered_map>
#include <jsi/jsi.h>
#include <mutex>

using namespace facebook;

namespace reanimated {

class StoreUser {
  int identifier = 0;
  static std::atomic<int> ctr;
  static std::unordered_map<int, std::vector<std::shared_ptr<jsi::Value>>> store;
  static std::mutex storeMutex;
  
public:
  StoreUser() {
    identifier = StoreUser::ctr++;
  }
  
  std::weak_ptr<jsi::Value> getWeakRef(jsi::Runtime &rt);
  void removeRefs();
  
  static void clearStore();
  virtual ~StoreUser();
};

}

#endif /* JSIStoreValueUser_h */
