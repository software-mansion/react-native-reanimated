#import <Foundation/Foundation.h>
#import <React/RCTConvert.h>
#import <React/RCTLog.h>

#ifndef REA_LOG_ERROR_IF_NIL

#define REA_LOG_ERROR_IF_NIL(value, errorMsg, nodeID) ({\
  if (value == nil) RCTLogError(errorMsg, nodeID);\
})

#endif
