//
// Created by Szymon Kapala on 2020-02-11.
//

#ifndef REANIMATEDEXAMPLE_SHAREDVALUEREGISTRY_H
#define REANIMATEDEXAMPLE_SHAREDVALUEREGISTRY_H

#include <memory>
#include <unordered_map>
#include <jsi/jsi.h>
#include "SharedValue.h"

using namespace facebook;

class SharedValueRegistry {
    std::unordered_map<int, std::shared_ptr<SharedValue>> sharedValueMap;
  public:
    void registerSharedValue(int id, std::shared_ptr<SharedValue> ptr);
    void unregisterSharedValue(int id);
    std::shared_ptr<SharedValue> getSharedValue(int id);

    std::unordered_map<int, std::shared_ptr<SharedValue>> getSharedValueMap() const;
};

#endif //REANIMATEDEXAMPLE_SHAREDVALUEREGISTRY_H
