#import <Foundation/Foundation.h>
#import <vector>
#import <string>
#import <React/RCTUIManager.h>

std::vector<std::pair<std::string,double>> measure(int viewTag, RCTUIManager *uiManager);
void scrollTo(int scrollViewTag, RCTUIManager *uiManager, double x, double y, bool animated);

