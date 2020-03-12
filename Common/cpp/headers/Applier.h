//
// Created by Szymon Kapala on 2020-02-12.
//

#ifndef REANIMATEDEXAMPLE_APPLIER_H
#define REANIMATEDEXAMPLE_APPLIER_H

#include <memory>
#include <vector>
#include <jsi/jsi.h>
#include "SharedValue.h"
#include "Worklet.h"
#include "BaseWorkletModule.h"

using namespace facebook;

class Applier {
  int applierId;
  std::vector<std::function<void()>> onFinishListeners;
  public:
    std::shared_ptr<Worklet> worklet;
    std::vector<std::shared_ptr<SharedValue>> sharedValues;
    Applier(int applierId, std::shared_ptr<Worklet> worklet, std::vector<std::shared_ptr<SharedValue>> sharedValues);
    virtual bool apply(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module);
    void addOnFinishListener(const std::function<void()> &listener);
    void finish();
    virtual ~Applier();
};

#endif //REANIMATEDEXAMPLE_APPLIER_H
