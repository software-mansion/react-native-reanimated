//
//  REASnapshooter.h
//  RNReanimated
//
//  Created by Szymon Kapala on 24/03/2021.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface REASnapshooter : NSObject

@property NSNumber* tag;
@property NSSet* capturableProps;

-(instancetype)initWithTag:(NSNumber*)tag capturableProps:(NSSet*)capturableProps;
-(void)takeSnapshot:(UIView*)view;

@end

NS_ASSUME_NONNULL_END
