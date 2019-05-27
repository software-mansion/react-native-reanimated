#import <Foundation/Foundation.h>

#define REA_LOG_ERROR_IF_NIL(value, errorMsg, nodeID) ({\
  if (value == nil) RCTLogError(errorMsg, nodeID);\
})
