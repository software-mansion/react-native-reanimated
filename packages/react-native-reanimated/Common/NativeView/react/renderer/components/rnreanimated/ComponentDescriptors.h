#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

using ReanimatedViewComponentDescriptor =
    ConcreteComponentDescriptor<ReanimatedShadowNode>;

void rnreanimated_registerComponentDescriptorsFromCodegen(
    const std::shared_ptr<const ComponentDescriptorProviderRegistry> &registry);

} // namespace facebook::react
