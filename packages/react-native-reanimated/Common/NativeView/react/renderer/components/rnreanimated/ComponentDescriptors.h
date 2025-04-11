#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include "ShadowNodes.h"

namespace facebook::react {

using ReanimatedViewComponentDescriptor =
    ConcreteComponentDescriptor<ReanimatedViewCustomShadowNode>;

void rnreanimated_registerComponentDescriptorsFromCodegen(
    std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);

} // namespace facebook::react
