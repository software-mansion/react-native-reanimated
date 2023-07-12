#ifdef RCT_NEW_ARCH_ENABLED

#include "FabricUtils.h"

#include <react/renderer/debug/SystraceSection.h>
#include <react/renderer/uimanager/UIManagerBinding.h>

using namespace facebook::react;

namespace reanimated {

std::shared_ptr<const ContextContainer> getContextContainerFromUIManager(
    const UIManager *uiManager) {
  return reinterpret_cast<const UIManagerPublic *>(uiManager)
      ->contextContainer_;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
