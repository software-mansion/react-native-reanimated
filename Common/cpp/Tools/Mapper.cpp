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
               std::shared_ptr<ShareableValue> name):
id(id),
module(module),
mapper(mapper),
inputs(inputs),
outputs(outputs)
{
  this->updater = updater;
  this->tag = tag;
  this->name = name;
  jsi::Runtime* rt = module->runtime.get();
  
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
//  mapper->callWithThis(rt, *mapper);// call styleUpdater
  auto result = updaterFn->call(rt).asObject(rt);
  module->updaterFunction(rt, tagInt, name->getValue(rt), result);
}

Mapper::~Mapper() {
  for (auto input : inputs) {
    input->removeListener(id);
  }
}

}
