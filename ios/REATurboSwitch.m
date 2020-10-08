#import "REATurboSwitch.h"

BOOL REAturbo_reanimated = YES;

BOOL REATurboReanimatedEnabled(void) {
  return REAturbo_reanimated;
};

void REAEnableTurboReanimated(BOOL state) {
  REAturbo_reanimated = state;
};
