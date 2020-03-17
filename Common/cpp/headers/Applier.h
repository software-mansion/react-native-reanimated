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
#include "ErrorHandler.h"
#include "SharedValueRegistry.h"

using namespace facebook;

class Applier {
  int applierId;
  std::vector<std::function<void()>> onFinishListeners;
  std::shared_ptr<ErrorHandler> errorHandler;
  std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
  public:
    std::shared_ptr<Worklet> worklet;
    std::vector<int> sharedValueIds;
    Applier(int applierId,
            std::shared_ptr<Worklet> worklet,
            std::vector<int> sharedValueIds,
            std::shared_ptr<ErrorHandler> errorHandler,
            std::shared_ptr<SharedValueRegistry> sharedValueRegistry);
    virtual bool apply(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module);
    void addOnFinishListener(const std::function<void()> &listener);
    void finish();
    virtual ~Applier();
};

#endif //REANIMATEDEXAMPLE_APPLIER_H
