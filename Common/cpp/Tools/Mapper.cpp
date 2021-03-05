#include "Mapper.h"
#include "SharedParent.h"
#include "MutableValue.h"
#include "RuntimeManager.h"

namespace reanimated {

Mapper::Mapper(RuntimeManager *runtimeManager,
               unsigned long id,
               std::shared_ptr<jsi::Function> mapper,
               std::vector<std::shared_ptr<MutableValue>> inputs,
               std::vector<std::shared_ptr<MutableValue>> outputs):
id(id),
runtimeManager(runtimeManager),
mapper(mapper),
inputs(inputs),
outputs(outputs) {
  auto markDirty = [this, runtimeManager]() {
    this->dirty = true;
    runtimeManager->maybeRequestRender();
  };
  for (auto input : inputs) {
    input->addListener(id, markDirty);
  }
}

void Mapper::execute(jsi::Runtime &rt) {
  dirty = false;
  mapper->callWithThis(rt, *mapper);
}

Mapper::~Mapper() {
  for (auto input : inputs) {
    input->removeListener(id);
  }
}

}
