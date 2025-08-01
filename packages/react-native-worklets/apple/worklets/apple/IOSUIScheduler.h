#import <worklets/Tools/UIScheduler.h>

namespace worklets {

using namespace facebook;
using namespace react;
using namespace worklets;

class IOSUIScheduler : public UIScheduler,
                       public std::enable_shared_from_this<IOSUIScheduler> {
 public:
  void scheduleOnUI(std::function<void()> job) override;
};

} // namespace worklets
