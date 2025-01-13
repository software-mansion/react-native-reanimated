/* eslint-disable perfectionist/sort-objects */

import { IS_WEB } from '@/utils';
import type { RouteNames, Routes } from '~/css/navigation/types';

import routeCards from './routeCards';
import {
  animatedProperties,
  animationSettings,
  miscellaneous,
  realWorldExamples,
  testExamples,
} from './screens';

/* Animated Properties routes */

const layoutAndPositioningRoutes = {
  FlexBox: {
    name: 'FlexBox',
    flatten: true,
    routes: {
      DiscreteProperties: {
        name: 'Discrete Properties',
        routes: {
          FlexDirection: {
            name: 'Flex Direction',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.FlexDirection,
          },
          LayoutDirection: {
            name: 'Layout Direction',
            labelTypes: ['iOS', 'Android'],
            Component:
              animatedProperties.layoutAndPositioning.flexBox.LayoutDirection,
          },
          JustifyContent: {
            name: 'Justify Content',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.JustifyContent,
          },
          AlignItems: {
            name: 'Align Items',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.AlignItems,
          },
          AlignSelf: {
            name: 'Align Self',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.AlignSelf,
          },
          AlignContent: {
            name: 'Align Content',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.AlignContent,
          },
          FlexWrap: {
            name: 'Flex Wrap',
            Component: animatedProperties.layoutAndPositioning.flexBox.FlexWrap,
          },
        },
      },
      NumericProperties: {
        name: 'Numeric Properties',
        routes: {
          Flex: {
            name: 'Flex',
            Component: animatedProperties.layoutAndPositioning.flexBox.Flex,
          },
          FlexBasis: {
            name: 'Flex Basis',
            labelTypes: ['web'],
            Component:
              animatedProperties.layoutAndPositioning.flexBox.FlexBasis,
          },
          FlexGrow: {
            name: 'Flex Grow',
            Component: animatedProperties.layoutAndPositioning.flexBox.FlexGrow,
          },
          FlexShrink: {
            name: 'Flex Shrink',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.FlexShrink,
          },
          Gap: {
            name: 'Gap',
            Component: animatedProperties.layoutAndPositioning.flexBox.Gap,
          },
          RowGap: {
            name: 'Row Gap',
            Component: animatedProperties.layoutAndPositioning.flexBox.RowGap,
          },
          ColumnGap: {
            name: 'Column Gap',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.ColumnGap,
          },
          Start: {
            name: 'Start',
            labelTypes: ['iOS', 'Android'],
            Component: animatedProperties.layoutAndPositioning.flexBox.Start,
          },
          End: {
            name: 'End',
            labelTypes: ['iOS', 'Android'],
            Component: animatedProperties.layoutAndPositioning.flexBox.End,
          },
        },
      },
    },
  },
  Dimensions: {
    name: 'Dimensions',
    Component: animatedProperties.layoutAndPositioning.Dimensions,
  },
  Margins: {
    name: 'Margins',
    Component: animatedProperties.layoutAndPositioning.Margins,
  },
  Paddings: {
    name: 'Paddings',
    Component: animatedProperties.layoutAndPositioning.Paddings,
  },
  Insets: {
    name: 'Insets',
    Component: animatedProperties.layoutAndPositioning.Insets,
  },
  Others: {
    name: 'Others',
    routes: {
      Position: {
        name: 'Position',
        Component: animatedProperties.layoutAndPositioning.others.Position,
      },
      Display: {
        name: 'Display',
        Component: animatedProperties.layoutAndPositioning.others.Display,
      },
      Overflow: {
        name: 'Overflow',
        Component: animatedProperties.layoutAndPositioning.others.Overflow,
      },
      ZIndex: {
        name: 'Z-index',
        Component: animatedProperties.layoutAndPositioning.others.ZIndex,
      },
      AspectRatio: {
        name: 'Aspect Ratio',
        Component: animatedProperties.layoutAndPositioning.others.AspectRatio,
      },
    },
  },
} satisfies Routes;

const appearanceRoutes = {
  Colors: {
    name: 'Colors',
    routes: {
      ColorFormats: {
        name: 'Color Formats',
        Component: animatedProperties.appearance.colors.ColorFormats,
      },
      ColorFunctions: {
        name: 'Color Properties',
        Component: animatedProperties.appearance.colors.ColorProperties,
      },
    },
  },
  Shadows: {
    name: 'Shadows',
    flatten: true,
    routes: {
      ViewShadow: {
        name: 'View Shadow',
        routes: {
          ShadowOffset: {
            name: 'Shadow Offset',
            labelTypes: ['iOS', 'web'],
            Component: animatedProperties.appearance.shadows.ShadowOffset,
          },
          ShadowRadius: {
            name: 'Shadow Radius',
            labelTypes: ['iOS', 'web'],
            Component: animatedProperties.appearance.shadows.ShadowRadius,
          },
          ShadowOpacity: {
            name: 'Shadow Opacity',
            labelTypes: ['iOS', 'web'],
            Component: animatedProperties.appearance.shadows.ShadowOpacity,
          },
          ShadowColor: {
            name: 'Shadow Color',
            Component: animatedProperties.appearance.shadows.ShadowColor,
          },
          Elevation: {
            name: 'Elevation',
            labelTypes: ['Android'],
            Component: animatedProperties.appearance.shadows.Elevation,
          },
        },
      },
      TextShadow: {
        name: 'Text Shadow',
        routes: {
          TextShadowOffset: {
            name: 'Text Shadow Offset',
            Component: animatedProperties.appearance.shadows.TextShadowOffset,
          },
          TextShadowRadius: {
            name: 'Text Shadow Radius',
            Component: animatedProperties.appearance.shadows.TextShadowRadius,
          },
          TextShadowColor: {
            name: 'Text Shadow Color',
            labelTypes: ['web'],
            Component: animatedProperties.appearance.shadows.TextShadowColor,
          },
        },
      },
      CombinedShadows: {
        name: 'Combined Shadows',
        routes: {
          BoxShadow: {
            name: 'Box Shadow',
            Component: animatedProperties.appearance.shadows.BoxShadow,
          },
        },
      },
    },
  },
  Borders: {
    name: 'Borders',
    routes: {
      BorderRadius: {
        name: 'Border Radius',
        Component: animatedProperties.appearance.borders.BorderRadius,
      },
      BorderWidth: {
        name: 'Border Width',
        Component: animatedProperties.appearance.borders.BorderWidth,
      },
      BorderStyle: {
        name: 'Border Style',
        Component: animatedProperties.appearance.borders.BorderStyle,
      },
      // TODO - check if this is needed (it seems that this prop has no effect in React Native)
      // BorderCurve: {
      //   name: 'Border Curve',
      //   labelTypes: ['iOS'],
      //   Component: animatedProperties.appearance.borders.BorderCurve,
      // },
    },
  },
  Transforms: {
    name: 'Transforms',
    flatten: true,
    routes: {
      TransformProperties: {
        name: 'Transform Properties',
        routes: {
          Perspective: {
            name: 'Perspective',
            Component:
              animatedProperties.appearance.transforms.transformProperties
                .Perspective,
          },
          Rotate: {
            name: 'Rotate',
            Component:
              animatedProperties.appearance.transforms.transformProperties
                .Rotate,
          },
          Scale: {
            name: 'Scale',
            Component:
              animatedProperties.appearance.transforms.transformProperties
                .Scale,
          },
          Translate: {
            name: 'Translate',
            Component:
              animatedProperties.appearance.transforms.transformProperties
                .Translate,
          },
          Skew: {
            name: 'Skew',
            Component:
              animatedProperties.appearance.transforms.transformProperties.Skew,
          },
          Matrix: {
            name: 'Matrix',
            Component:
              animatedProperties.appearance.transforms.transformProperties
                .Matrix,
          },
        },
      },
      RelatedProperties: {
        name: 'Related Properties',
        routes: {
          TransformOrigin: {
            name: 'Transform Origin',
            Component:
              animatedProperties.appearance.transforms.relatedProperties
                .TransformOrigin,
          },
        },
      },
    },
  },
  Others: {
    name: 'Others',
    routes: {
      Opacity: {
        name: 'Opacity',
        Component: animatedProperties.appearance.others.Opacity,
      },
      BackfaceVisibility: {
        name: 'Backface Visibility',
        Component: animatedProperties.appearance.others.BackfaceVisibility,
      },
    },
  },
} satisfies Routes;

const typographyRoutes = {
  Font: {
    name: 'Font',
    routes: {
      FontFamily: {
        name: 'Font Family',
        labelTypes: ['unimplemented'],
        disabled: true,
        Component: animatedProperties.typography.font.FontFamily,
      },
      FontSize: {
        name: 'Font Size',
        Component: animatedProperties.typography.font.FontSize,
      },
      FontStyle: {
        name: 'Font Style',
        labelTypes: ['unimplemented'],
        disabled: true,
        Component: animatedProperties.typography.font.FontStyle,
      },
      FontVariant: {
        name: 'Font Variant',
        labelTypes: ['unimplemented'],
        disabled: true,
        Component: animatedProperties.typography.font.FontVariant,
      },
      FontWeight: {
        name: 'Font Weight',
        Component: animatedProperties.typography.font.FontWeight,
      },
    },
  },
  TextAlignment: {
    name: 'Text Alignment',
    routes: {
      TextAlign: {
        name: 'Text Align',
        Component: animatedProperties.typography.alignment.TextAlign,
      },
      VerticalAlign: {
        name: 'Vertical Align',
        labelTypes: ['web'],
        Component: animatedProperties.typography.alignment.VerticalAlign,
      },
      TextAlignVertical: {
        name: 'Text Align Vertical',
        labelTypes: ['Android'],
        Component: animatedProperties.typography.alignment.TextAlignVertical,
      },
    },
  },
  TextDecoration: {
    name: 'Text Decoration',
    disabled: true,
    labelTypes: ['unimplemented'],
    routes: {
      LetterSpacing: {
        name: 'Letter Spacing',
        Component: animatedProperties.typography.decoration.LetterSpacing,
      },
      LineHeight: {
        name: 'Line Height',
        Component: animatedProperties.typography.decoration.LineHeight,
      },
      TextTransform: {
        name: 'Text Transform',
        Component: animatedProperties.typography.decoration.TextTransform,
      },
      TextDecorationLine: {
        name: 'Text Decoration Line',
        Component: animatedProperties.typography.decoration.TextDecorationLine,
      },
      TextDecorationStyle: {
        name: 'Text Decoration Style',
        Component: animatedProperties.typography.decoration.TextDecorationStyle,
      },
    },
  },
  Others: {
    name: 'Others',
    disabled: true,
    labelTypes: ['unimplemented'],
    routes: {
      UserSelect: {
        name: 'User Select',
        Component: animatedProperties.typography.others.UserSelect,
      },
      WritingDirection: {
        name: 'Writing Direction',
        Component: animatedProperties.typography.others.WritingDirection,
      },
      IncludeFontPadding: {
        name: 'Include Font Padding',
        labelTypes: ['Android'],
        Component: animatedProperties.typography.others.IncludeFontPadding,
      },
    },
  },
} satisfies Routes;

const othersRoutes = {
  Image: {
    name: 'Image',
    disabled: true,
    labelTypes: ['unimplemented'],
    routes: {
      ResizeMode: {
        name: 'Resize Mode',
        Component: animatedProperties.others.image.ResizeMode,
      },
      ObjectFit: {
        name: 'Object Fit',
        Component: animatedProperties.others.image.ObjectFit,
      },
    },
  },
  Cursor: {
    name: 'Cursor',
    disabled: true,
    labelTypes: ['unimplemented'],
    routes: {
      Cursor: {
        name: 'Cursor',
        Component: animatedProperties.others.cursor.Cursor,
      },
      PointerEvents: {
        name: 'Pointer Events',
        Component: animatedProperties.others.cursor.PointerEvents,
      },
    },
  },
} satisfies Routes;

/* Animations routes */

const routes = {
  AnimatedProperties: {
    name: 'Animated Properties',
    CardComponent: routeCards.AnimatedPropertiesCard,
    flatten: true,
    routes: {
      LayoutAndPositioning: {
        name: 'Layout and Positioning',
        routes: layoutAndPositioningRoutes,
      },
      Appearance: {
        name: 'Appearance',
        routes: appearanceRoutes,
      },
      Typography: {
        name: 'Typography',
        routes: typographyRoutes,
      },
      Others: {
        name: 'Others',
        routes: othersRoutes,
      },
    },
  },
  AnimationSettings: {
    name: 'Animation Settings',
    CardComponent: routeCards.AnimationSettingsCard,
    routes: {
      Duration: {
        name: 'Duration',
        Component: animationSettings.AnimationDuration,
      },
      TimingFunction: {
        name: 'Timing Function',
        Component: animationSettings.AnimationTimingFunction,
      },
      Delay: {
        name: 'Delay',
        Component: animationSettings.AnimationDelay,
      },
      IterationCount: {
        name: 'Iteration Count',
        Component: animationSettings.AnimationIterationCount,
      },
      Direction: {
        name: 'Direction',
        Component: animationSettings.AnimationDirection,
      },
      FillMode: {
        name: 'Fill Mode',
        Component: animationSettings.AnimationFillMode,
      },
      PlayState: {
        name: 'Play State',
        Component: animationSettings.AnimationPlayState,
      },
    },
  },
  Miscellaneous: {
    name: 'Miscellaneous',
    CardComponent: routeCards.MiscellaneousCard,
    routes: {
      ChangingAnimation: {
        name: 'Changing Animation',
        Component: miscellaneous.ChangingAnimation,
      },
      UpdatingAnimationSettings: {
        name: 'Updating Animation Settings',
        Component: miscellaneous.UpdatingAnimationSettings,
      },
      KeyframeTimingFunctions: {
        labelTypes: ['new'],
        name: 'Keyframe Timing Functions',
        Component: miscellaneous.KeyframeTimingFunctions,
      },
      MultipleAnimations: {
        labelTypes: ['new'],
        name: 'Multiple Animations',
        Component: miscellaneous.MultipleAnimations,
      },
    },
  },
  RealWorldExamples: {
    name: 'Real World Examples',
    CardComponent: routeCards.RealWorldExamplesCard,
    routes: {
      SpinnersAndLoaders: {
        name: 'Spinners and Loaders',
        Component: realWorldExamples.SpinnersAndLoaders,
      },
      Emojis: {
        name: 'Emojis',
        Component: realWorldExamples.Emojis,
      },
      Campfire: {
        name: 'Campfire',
        Component: realWorldExamples.Campfire,
      },
      RocketInSpace: {
        name: 'Rocket In Space',
        Component: realWorldExamples.RocketInSpace,
      },
      SquishySquashy: {
        name: 'Squishy Squashy',
        Component: realWorldExamples.SquishySquashy,
      },
    },
  },
  TestExamples: {
    name: 'Test Examples',
    CardComponent: routeCards.TestExamplesCard,
    routes: {
      Playground: {
        name: 'Playground',
        Component: testExamples.Playground,
      },
      IterationCountAndFillMode: {
        name: 'Iteration Count and Fill Mode',
        displayed: !IS_WEB,
        labelTypes: ['needsFix'],
        Component: testExamples.IterationCountAndFillMode,
      },
      RelativeMargins: {
        name: 'Relative Margins',
        displayed: !IS_WEB,
        labelTypes: ['needsFix'],
        Component: testExamples.RelativeMargins,
      },
    },
  },
} satisfies Routes;

export type AnimationsNavigationRouteName = RouteNames<
  'Animations',
  typeof routes
>;

export default routes;
