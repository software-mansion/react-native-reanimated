#pragma once

#include "ShareableValue.h"
#include "NativeReanimatedModule.h"
#include <stdio.h>
#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated {

class MapperRegistry;

class Mapper : public std::enable_shared_from_this<Mapper> {
  friend MapperRegistry;
private:
  unsigned long id;
  NativeReanimatedModule *module;
  std::shared_ptr<jsi::Function> mapper;
  std::vector<std::shared_ptr<MutableValue>> inputs;
  std::vector<std::shared_ptr<MutableValue>> outputs;
  bool dirty = true;
  std::shared_ptr<jsi::Function> userUpdater;
  UpdaterFunction* updateProps;
  jsi::Value viewName;
  int viewTag;
  int optimalizationLvl = 0;

public:
  Mapper(NativeReanimatedModule *module,
         unsigned long id,
         std::shared_ptr<jsi::Function> mapper,
         std::vector<std::shared_ptr<MutableValue>> inputs,
         std::vector<std::shared_ptr<MutableValue>> outputs,
         std::shared_ptr<ShareableValue> updater,
         const int viewTag,
         const std::string& viewName,
         const int optimalizationLvl);
  void execute(jsi::Runtime &rt);
  virtual ~Mapper();
};

}
