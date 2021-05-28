#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface REASnapshooter : NSObject

@property NSNumber* tag;
@property NSSet* capturableProps;
@property NSMutableArray<UIView*>* listView;
@property NSMutableDictionary<NSString*, NSMutableDictionary<NSString*, NSNumber*>*>* capturedValues;

-(instancetype)initWithTag:(NSNumber*)tag capturableProps:(NSSet*)capturableProps;
-(void)takeSnapshot:(UIView*)view;

+ (NSString*)idFor:(UIView *)view;

@end

NS_ASSUME_NONNULL_END
