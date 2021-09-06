#import <Foundation/Foundation.h>
#import <React/RCTUIManager.h>
#import <string>
#import <vector>

namespace reanimated {

std::vector<std::pair<std::string, double>> measure(
    int viewTag,
    RCTUIManager *uiManager);
void scrollTo(
    int scrollViewTag,
    RCTUIManager *uiManager,
    double x,
    double y,
    bool animated);

} // namespace reanimated
