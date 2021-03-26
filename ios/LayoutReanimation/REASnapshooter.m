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
    _listView = [NSMutableArray new];
    _capturedValues = [NSMutableDictionary new];
    return self;
  }
  return nil;
}

-(void)takeSnapshot:(UIView*)view
{
  NSMutableDictionary* values = [NSMutableDictionary new];
  UIView *windowView = UIApplication.sharedApplication.keyWindow;
  CGPoint origin = view.frame.origin; [[view superview] convertPoint:view.frame.origin toView:windowView]; //TODO choose correct origin
  
  for (NSString* value in _capturableProps)
  {
    
    if ([value isEqual:@"width"]) {
      values[@"width"] = [NSNumber numberWithDouble:(double)(view.frame.size.width)];
    } else if ([value isEqual:@"height"]) {
      values[@"height"] = [NSNumber numberWithDouble:(double)(view.frame.size.height)];
    } else if ([value isEqual:@"originX"]) {
      values[@"originX"] = [NSNumber numberWithDouble:origin.x];
    } else if ([value isEqual:@"originY"]) {
      values[@"originY"] = [NSNumber numberWithDouble:origin.y];
    }
  }
  
  [_listView addObject:view];
  self.capturedValues[[NSValue valueWithNonretainedObject:view]] = values;
}

@end
