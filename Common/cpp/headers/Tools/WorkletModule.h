//
// Created by Szymon Kapala on 2020-02-13.
//

#ifndef REANIMATEDEXAMPLE_WORKLETMODULE_H
#define REANIMATEDEXAMPLE_WORKLETMODULE_H

#include <memory>
#include <jsi/jsi.h>
#include "WorkletRegistry.h"
#include "SharedValueRegistry.h"
#include "SharedValue.h"
#include "SharedDouble.h"
#include "WorkletModule.h"
#include "ApplierRegistry.h"
#include "Scheduler.h"
#include <vector>
#include "BaseWorkletModule.h"
#include "SharedWorkletStarter.h"
#include "ErrorHandler.h"

using namespace facebook;

class WorkletModule : public BaseWorkletModule {
  std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
  std::shared_ptr<ApplierRegistry> applierRegistry;
  std::shared_ptr<WorkletRegistry> workletRegistry;
  std::shared_ptr<jsi::Value> event;
  std::shared_ptr<ErrorHandler> errorHandler;
  int workletId, applierId;
  public:
    WorkletModule(std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
                    std::shared_ptr<ApplierRegistry> applierRegistry,
                    std::shared_ptr<WorkletRegistry> workletRegistry,
                    std::shared_ptr<jsi::Value> event,
                    std::shared_ptr<ErrorHandler> errorHandler
                    );
                    
    jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) override;

    void setEvent(std::shared_ptr<jsi::Value> event);
    void setWorkletId(int workletId) override;
    void setApplierId(int applierId) override;
    void setJustStarted(bool justStarted) override;
};

#endif //REANIMATEDEXAMPLE_WORKLETMODULE_H
