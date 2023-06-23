#import <Foundation/Foundation.h>

#define REA_LOG_ERROR_IF_NIL(value, errorMsg) \
  ({                                          \
    if (value == nil)                         \
      RCTLogError(errorMsg);                  \
  })

@interface REAUtils : NSObject
+ (void)swizzleMethod:(SEL)originalSelector
             forClass:(Class)originalClass
                 with:(SEL)newSelector
            fromClass:(Class)newClass;
@end
