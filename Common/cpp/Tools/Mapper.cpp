#include "Mapper.h"
#include "MutableValue.h"
#include "SharedParent.h"

namespace reanimated {

Mapper::Mapper(
    NativeReanimatedModule *module,
    unsigned long id,
    std::shared_ptr<jsi::Function> mapper,
    std::vector<std::shared_ptr<MutableValue>> inputs,
    std::vector<std::shared_ptr<MutableValue>> outputs)
    : id(id), module(module), mapper(mapper), inputs(inputs), outputs(outputs) {
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
  if (optimalizationLvl == 0) {
    mapper->callWithThis(rt, *mapper); // call styleUpdater
  } else {
#ifdef RCT_NEW_ARCH_ENABLED
    jsi::Value newStyle = userUpdater->call(rt).asObject(rt);
#else
    jsi::Object newStyle = userUpdater->call(rt).asObject(rt);
#endif
    auto jsViewDescriptorArray = viewDescriptors->getValue(rt)
                                     .getObject(rt)
                                     .getProperty(rt, "value")
                                     .asObject(rt)
                                     .getArray(rt);
    for (int i = 0; i < jsViewDescriptorArray.length(rt); ++i) {
      auto jsViewDescriptor =
          jsViewDescriptorArray.getValueAtIndex(rt, i).getObject(rt);
#ifdef RCT_NEW_ARCH_ENABLED
      updateProps(
          rt, jsViewDescriptor.getProperty(rt, "shadowNodeWrapper"), newStyle);
#else
      updateProps(
          rt,
          static_cast<int>(jsViewDescriptor.getProperty(rt, "tag").asNumber()),
          jsViewDescriptor.getProperty(rt, "name"),
          newStyle);
#endif
    }
  }
}

void Mapper::enableFastMode(
    const int optimalizationLvl,
    const std::shared_ptr<ShareableValue> &updater,
    const std::shared_ptr<ShareableValue> &jsViewDescriptors) {
  if (optimalizationLvl == 0) {
    return;
  }
  viewDescriptors = jsViewDescriptors;
  this->optimalizationLvl = optimalizationLvl;
#ifdef RCT_NEW_ARCH_ENABLED
  updateProps = [this](
                    jsi::Runtime &rt,
                    const jsi::Value &shadowNodeValue,
                    const jsi::Value &props) {
    this->module->updateProps(rt, shadowNodeValue, props);
  };
#else
  // TODO: don't get public field, instead call this->module->updateProps
  updateProps = module->updatePropsFunction;
#endif
  jsi::Runtime &rt = *module->runtime;
  userUpdater = std::make_shared<jsi::Function>(
      updater->getValue(rt).asObject(rt).asFunction(rt));
}

Mapper::~Mapper() {
  for (auto input : inputs) {
    input->removeListener(id);
  }
}

} // namespace reanimated
