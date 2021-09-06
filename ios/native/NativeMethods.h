#import <Foundation/Foundation.h>
#import <React/RCTUIManager.h>
#include <string>
#import <string>
#include <utility>
#include <vector>
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
