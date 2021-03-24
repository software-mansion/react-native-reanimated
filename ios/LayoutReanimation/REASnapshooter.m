//
//  REASnapshooter.m
//  RNReanimated
//
//  Created by Szymon Kapala on 24/03/2021.
//

#import "REASnapshooter.h"

@implementation REASnapshooter 

-(instancetype)initWithTag:(NSNumber*)tag capturableProps:(NSSet*)capturableProps
{
  if (self = [super init]) {
    _capturableProps = capturableProps;
    _tag = tag;
    return self;
  }
  return nil;
}

-(void)takeSnapshot:(UIView*)view
{
  //Todo
}

@end
