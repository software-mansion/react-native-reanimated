#import <Foundation/Foundation.h>
#import <RNGestureHandlerStateManager.h>
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
void setGestureState(
    id<RNGestureHandlerStateManager> gestureHandlerStateManager,
    int handlerTag,
    int newState);

} // namespace reanimated
