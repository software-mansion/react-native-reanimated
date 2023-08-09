#if !TARGET_OS_OSX

#import <UIKit/UIKit.h>

#define RNAUIView UIView

#else // TARGET_OS_OSX [

#ifdef __cplusplus
extern "C" {
#endif

#import <React/RCTUIKit.h>

#ifdef __cplusplus
}
#endif

#define RNAUIView RCTUIView

#endif // ] TARGET_OS_OSX
