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
  NSMutableDictionary* values = [NSMutableDictionary new];
  UIView *windowView = UIApplication.sharedApplication.keyWindow;
  CGRect frame = [windowView.superview convertRect:view.frame toView:windowView];
  
  for (NSString* value in _capturableProps)
  {
    
    if ([value isEqual:@"width"]) {
        values[@"width"] = [NSNumber numberWithDouble:(double)(frame.size.width)];
    } else if ([value isEqual:@"height"]) {
      values[@"height"] = [NSNumber numberWithDouble:(double)(frame.size.height)];
    } else if ([value isEqual:@"originX"]) {
      values[@"originX"] = [NSNumber numberWithDouble:frame.origin.x];
    } else if ([value isEqual:@"originY"]) {
      values[@"originY"] = [NSNumber numberWithDouble:frame.origin.y];
    }
  }
  
  self.capturedValues[view] = values;
}

@end
