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
  std::shared_ptr<ShareableValue> updater;
  std::shared_ptr<jsi::Function> updaterFn;
  std::shared_ptr<ShareableValue> tag;
  std::shared_ptr<ShareableValue> name;
  jsi::Value nameJs;
  int tagInt;
  UpdaterFunction* updaterFunction;
  int optimalizationLvl = 0;

public:
  Mapper(NativeReanimatedModule *module,
         unsigned long id,
         std::shared_ptr<jsi::Function> mapper,
         std::vector<std::shared_ptr<MutableValue>> inputs,
         std::vector<std::shared_ptr<MutableValue>> outputs,
         // mleko
         std::shared_ptr<ShareableValue> updater,
         std::shared_ptr<ShareableValue> tag,
         std::shared_ptr<ShareableValue> name,
         int optimalizationLvl);
  void execute(jsi::Runtime &rt);
  virtual ~Mapper();
};

}
