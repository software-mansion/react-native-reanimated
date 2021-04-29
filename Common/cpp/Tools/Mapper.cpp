#include "Mapper.h"
#include "SharedParent.h"
#include "MutableValue.h"

namespace reanimated {

Mapper::Mapper(NativeReanimatedModule *module,
               unsigned long id,
               std::shared_ptr<jsi::Function> mapper,
               std::vector<std::shared_ptr<MutableValue>> inputs,
               std::vector<std::shared_ptr<MutableValue>> outputs,
               std::shared_ptr<ShareableValue> updater,
               const int viewTag,
               const std::string& viewName,
               const int optimalizationLvl):
id(id),
module(module),
mapper(mapper),
inputs(inputs),
outputs(outputs),
viewTag(viewTag),
optimalizationLvl(optimalizationLvl)
{
  jsi::Runtime* rt = module->runtime.get();
  this->viewName = jsi::Value(*rt, jsi::String::createFromUtf8(*rt, viewName));
  updateProps = &module->updaterFunction;
  userUpdater = std::make_shared<jsi::Function>(updater->getValue(*rt).asObject(*rt).asFunction(*rt));
  
  
  auto markDirty = [this, module]() {
    this->dirty = true;
    module->maybeRequestRender();
  };
  for (auto input : inputs) {
    input->addListener(id, markDirty);
  }
}

void Mapper::execute(jsi::Runtime &rt) {
  dirty = false;
  if(optimalizationLvl == 0) {
    mapper->callWithThis(rt, *mapper);// call styleUpdater
  }
  else {
    (*updateProps)(rt, viewTag, viewName, userUpdater->call(rt).asObject(rt));
  }
}

Mapper::~Mapper() {
  for (auto input : inputs) {
    input->removeListener(id);
  }
}

}
