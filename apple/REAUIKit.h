#if !TARGET_OS_OSX

#import <UIKit/UIKit.h>

typedef UIView REAUIView;

#else // TARGET_OS_OSX [

#ifdef __cplusplus
extern "C" {
#endif

#import <React/RCTUIKit.h>

#ifdef __cplusplus
}
#endif

typedef RCTUIView REAUIView;

#endif // ] TARGET_OS_OSX
