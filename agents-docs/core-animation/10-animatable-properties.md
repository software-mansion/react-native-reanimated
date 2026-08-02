---
title: Animatable Properties
source: https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CoreAnimation_guide/AnimatableProperties/AnimatableProperties.html
---

[Next](11-key-value-coding-extensions.md)  [Previous](09-layer-style-property-animations.md)

# Animatable Properties

Many of the properties in `CALayer` and `CIFilter` can be animated. This appendix lists those properties, along with the animation used by default.

## CALayer Animatable Properties

Table B-1 lists the properties of the `CALayer` class that you might consider animating. For each property, the table also lists the type of default animation object that is created to execute an implicit animation.

Table B-1 Layer properties and their default animations

Property

Default animation

`anchorPoint`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`backgroundColor`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`backgroundFilters`

Uses the default implied `CATransition` object, described in  [Table B-3](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW3). Sub-properties of the filters are animated using the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`borderColor`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`borderWidth`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`bounds`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`compositingFilter`

Uses the default implied `CATransition` object, described in  [Table B-3](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW3). Sub-properties of the filters are animated using the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`contents`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`contentsRect`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`cornerRadius`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`doubleSided`

There is no default implied animation.

`filters`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2). Sub-properties of the filters are animated using the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`frame`

This property is not animatable. You can achieve the same results by animating the `bounds` and `position` properties.

`hidden`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`mask`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`masksToBounds`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`opacity`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`position`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`shadowColor`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`shadowOffset`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`shadowOpacity`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`shadowPath`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`shadowRadius`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`sublayers`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`sublayerTransform`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`transform`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

`zPosition`

Uses the default implied `CABasicAnimation` object, described in  [Table B-2](10-animatable-properties.md#//apple_ref/doc/uid/TP40004514-CH11-SW2).

Table B-2 lists the animation attributes for the default property-based animations.

Table B-2 Default Implied Basic Animation

Description

Value

Class

`CABasicAnimation`

Duration

0.25 seconds, or the duration of the current transaction

Key path

Set to the property name of the layer.

Table B-3 lists the animation object configuration for default transition-based animations.

Table B-3 Default Implied Transition

Description

Value

Class

`CATransition`

Duration

0.25 seconds, or the duration of the current transaction

Type

Fade (`kCATransitionFade`)

Start progress

`0.0`

End progress

`1.0`

## CIFilter Animatable Properties

Core Animation adds the following animatable properties to Core Image’s `CIFilter` class. These properties are available only on OS X.

- `name`

- `enabled`

For more information about these additions, see CIFilter Core Animation Additions.
 [Next](11-key-value-coding-extensions.md)  [Previous](09-layer-style-property-animations.md)

 Copyright © 2015 Apple Inc. All Rights Reserved.  [Terms of Use](http://www.apple.com/legal/internet-services/terms/site.html)  |  [Privacy Policy](http://www.apple.com/privacy/)  | Updated: 2015-03-09
