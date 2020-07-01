#import <Foundation/Foundation.h>
#include <vector>
#include <string>
#import <React/RCTUIManager.h>

NS_ASSUME_NONNULL_BEGIN

std::vector<std::pair<std::string,double>> measure(int viewTag, RCTUIManager *uiManager);
void scrollTo(int scrollViewTag, RCTUIManager *uiManager, double x, double y, bool animated);

NS_ASSUME_NONNULL_END
