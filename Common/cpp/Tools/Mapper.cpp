#include "Mapper.h"
#include "SharedParent.h"
#include "MutableValue.h"

namespace reanimated {

Mapper::Mapper(NativeReanimatedModule *module,
               unsigned long id,
               std::shared_ptr<jsi::Function> mapper,
               std::vector<std::shared_ptr<MutableValue>> inputs,
               std::vector<std::shared_ptr<MutableValue>> outputs,
               // mleko
               std::shared_ptr<ShareableValue> updater,
               std::shared_ptr<ShareableValue> tag,
               std::shared_ptr<ShareableValue> name,
               int optimalizationLvl):
id(id),
module(module),
mapper(mapper),
inputs(inputs),
outputs(outputs)
{
  this->updater = updater;
  this->tag = tag;
  
  jsi::Runtime* rt = module->runtime.get();
  this->nameJs = name->getValue(*rt);
  updaterFunction = &module->updaterFunction;
  this->optimalizationLvl = optimalizationLvl;
  
  auto updaterTmp = updater->getValue(*rt).asObject(*rt).asFunction(*rt);
  updaterFn = std::make_shared<jsi::Function>(std::move(updaterTmp));
  
  tagInt = tag->getValue(*rt).asNumber();
  
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
    (*updaterFunction)(rt, tagInt, nameJs, updaterFn->call(rt).asObject(rt));
  }
}

Mapper::~Mapper() {
  for (auto input : inputs) {
    input->removeListener(id);
  }
}

}
