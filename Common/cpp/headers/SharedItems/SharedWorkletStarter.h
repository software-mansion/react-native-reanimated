//
// Created by Szymon Kapala on 2020-03-05.
//

#ifndef REANIMATEDEXAMPLE_SHAREDWORKLETSTARTER_H
#define REANIMATEDEXAMPLE_SHAREDWORKLETSTARTER_H

#include "SharedValue.h"
#include "Worklet.h"
#include "ApplierRegistry.h"
#include "SharedValueRegistry.h"
#include "ErrorHandler.h"
#include <vector>

class SharedWorkletStarter : public SharedValue {
  jsi::Value parameter;
public:
  std::shared_ptr<Worklet> worklet;
  int id;
  int applierId;
  std::vector<int> args;
  std::weak_ptr<SharedValueRegistry> sharedValueRegistry;
  std::weak_ptr<ApplierRegistry> applierRegistry;
    
  SharedWorkletStarter(
      int svId,
      std::shared_ptr<Worklet> worklet,
      std::vector<int> args,
      std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
      std::shared_ptr<ApplierRegistry> applierRegistry);
  jsi::Value asValue(jsi::Runtime &rt) const override;
  jsi::Value asParameter(jsi::Runtime &rt, std::shared_ptr<SharedValue> sv) override;
  void setNewValue(std::shared_ptr<SharedValue> sv) override;
  void willUnregister(jsi::Runtime &rt) override;
  std::shared_ptr<SharedValue> copy() override;
  std::vector<int> getSharedValues() override;
  
  ~SharedWorkletStarter();
};

#endif //REANIMATEDEXAMPLE_SHAREDWORKLETSTARTER_H
