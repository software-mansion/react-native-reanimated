#import <worklets/Tools/UIScheduler.h>

#import <React/RCTUIManager.h>
#import <ReactCommon/CallInvoker.h>

#import <memory>

namespace reanimated {

using namespace facebook;
using namespace react;
using namespace worklets;

class REAIOSUIScheduler : public UIScheduler {
 public:
  void scheduleOnUI(std::function<void()> job) override;
};

} // namespace reanimated
