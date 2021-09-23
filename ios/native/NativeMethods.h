#import <Foundation/Foundation.h>
#import <React/RCTUIManager.h>
#include <string>
#import <string>
#include <utility>
#include <vector>
#import <vector>
#import "RNCustomGestureHandler.h"

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
void setGestureState(
    id<RNCustomGestureHandler> externalCustomGestureHandler,
    int handlerTag,
    int newState);

} // namespace reanimated
