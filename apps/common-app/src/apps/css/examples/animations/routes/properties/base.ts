import { baseAnimatedProperties } from '@/apps/css/examples/animations/screens';
import type { Routes } from '@/apps/css/navigation/types';

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
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexDirection,
          },
          LayoutDirection: {
            name: 'Layout Direction',
            labelTypes: ['iOS', 'Android'],
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox
                .LayoutDirection,
          },
          JustifyContent: {
            name: 'Justify Content',
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox
                .JustifyContent,
          },
          AlignItems: {
            name: 'Align Items',
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.AlignItems,
          },
          AlignSelf: {
            name: 'Align Self',
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.AlignSelf,
          },
          AlignContent: {
            name: 'Align Content',
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.AlignContent,
          },
          FlexWrap: {
            name: 'Flex Wrap',
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexWrap,
          },
        },
      },
      NumericProperties: {
        name: 'Numeric Properties',
        routes: {
          Flex: {
            name: 'Flex',
            Component: baseAnimatedProperties.layoutAndPositioning.flexBox.Flex,
          },
          FlexBasis: {
            name: 'Flex Basis',
            labelTypes: ['web'],
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexBasis,
          },
          FlexGrow: {
            name: 'Flex Grow',
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexGrow,
          },
          FlexShrink: {
            name: 'Flex Shrink',
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexShrink,
          },
          Gap: {
            name: 'Gap',
            Component: baseAnimatedProperties.layoutAndPositioning.flexBox.Gap,
          },
          RowGap: {
            name: 'Row Gap',
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.RowGap,
          },
          ColumnGap: {
            name: 'Column Gap',
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.ColumnGap,
          },
          Start: {
            name: 'Start',
            labelTypes: ['iOS', 'Android'],
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.Start,
          },
          End: {
            name: 'End',
            labelTypes: ['iOS', 'Android'],
            Component: baseAnimatedProperties.layoutAndPositioning.flexBox.End,
          },
        },
      },
    },
  },
  Dimensions: {
    name: 'Dimensions',
    Component: baseAnimatedProperties.layoutAndPositioning.Dimensions,
  },
  Margins: {
    name: 'Margins',
    Component: baseAnimatedProperties.layoutAndPositioning.Margins,
  },
  Paddings: {
    name: 'Paddings',
    Component: baseAnimatedProperties.layoutAndPositioning.Paddings,
  },
  Insets: {
    name: 'Insets',
    Component: baseAnimatedProperties.layoutAndPositioning.Insets,
  },
  Others: {
    name: 'Others',
    routes: {
      Position: {
        name: 'Position',
        Component: baseAnimatedProperties.layoutAndPositioning.others.Position,
      },
      Display: {
        name: 'Display',
        Component: baseAnimatedProperties.layoutAndPositioning.others.Display,
      },
      Overflow: {
        name: 'Overflow',
        Component: baseAnimatedProperties.layoutAndPositioning.others.Overflow,
      },
      ZIndex: {
        name: 'Z-index',
        Component: baseAnimatedProperties.layoutAndPositioning.others.ZIndex,
      },
      AspectRatio: {
        name: 'Aspect Ratio',
        Component:
          baseAnimatedProperties.layoutAndPositioning.others.AspectRatio,
      },
      BoxSizing: {
        name: 'Box Sizing',
        labelTypes: ['web'],
        Component: baseAnimatedProperties.layoutAndPositioning.others.BoxSizing,
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
        Component: baseAnimatedProperties.appearance.colors.ColorFormats,
      },
      ColorProperties: {
        name: 'Color Properties',
        Component: baseAnimatedProperties.appearance.colors.ColorProperties,
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
            Component: baseAnimatedProperties.appearance.shadows.ShadowOffset,
          },
          ShadowRadius: {
            name: 'Shadow Radius',
            labelTypes: ['iOS', 'web'],
            Component: baseAnimatedProperties.appearance.shadows.ShadowRadius,
          },
          ShadowOpacity: {
            name: 'Shadow Opacity',
            labelTypes: ['iOS', 'web'],
            Component: baseAnimatedProperties.appearance.shadows.ShadowOpacity,
          },
          ShadowColor: {
            name: 'Shadow Color',
            Component: baseAnimatedProperties.appearance.shadows.ShadowColor,
          },
          Elevation: {
            name: 'Elevation',
            labelTypes: ['Android'],
            Component: baseAnimatedProperties.appearance.shadows.Elevation,
          },
        },
      },
      TextShadow: {
        name: 'Text Shadow',
        routes: {
          TextShadowOffset: {
            name: 'Text Shadow Offset',
            Component:
              baseAnimatedProperties.appearance.shadows.TextShadowOffset,
          },
          TextShadowRadius: {
            name: 'Text Shadow Radius',
            Component:
              baseAnimatedProperties.appearance.shadows.TextShadowRadius,
          },
          TextShadowColor: {
            name: 'Text Shadow Color',
            Component:
              baseAnimatedProperties.appearance.shadows.TextShadowColor,
          },
        },
      },
      CombinedShadows: {
        name: 'Combined Shadows',
        routes: {
          BoxShadow: {
            name: 'Box Shadow',
            Component: baseAnimatedProperties.appearance.shadows.BoxShadow,
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
        Component: baseAnimatedProperties.appearance.borders.BorderRadius,
      },
      BorderWidth: {
        name: 'Border Width',
        Component: baseAnimatedProperties.appearance.borders.BorderWidth,
      },
      BorderStyle: {
        name: 'Border Style',
        Component: baseAnimatedProperties.appearance.borders.BorderStyle,
      },
    },
  },
  Outlines: {
    name: 'Outlines',
    routes: {
      OutlineOffset: {
        name: 'Outline Offset',
        Component: baseAnimatedProperties.appearance.outlines.OutlineOffset,
      },
      OutlineStyle: {
        name: 'Outline Style',
        Component: baseAnimatedProperties.appearance.outlines.OutlineStyle,
      },
      OutlineWidth: {
        name: 'Outline Width',
        Component: baseAnimatedProperties.appearance.outlines.OutlineWidth,
      },
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
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Perspective,
          },
          Rotate: {
            name: 'Rotate',
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Rotate,
          },
          Scale: {
            name: 'Scale',
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Scale,
          },
          Translate: {
            name: 'Translate',
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Translate,
          },
          Skew: {
            name: 'Skew',
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Skew,
          },
          Matrix: {
            name: 'Matrix',
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
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
              baseAnimatedProperties.appearance.transforms.relatedProperties
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
        Component: baseAnimatedProperties.appearance.others.Opacity,
      },
      BackfaceVisibility: {
        name: 'Backface Visibility',
        Component: baseAnimatedProperties.appearance.others.BackfaceVisibility,
      },
      MixBlendMode: {
        name: 'Mix Blend Mode',
        Component: baseAnimatedProperties.appearance.others.MixBlendMode,
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
        Component: baseAnimatedProperties.typography.font.FontFamily,
      },
      FontSize: {
        name: 'Font Size',
        Component: baseAnimatedProperties.typography.font.FontSize,
      },
      FontStyle: {
        name: 'Font Style',
        Component: baseAnimatedProperties.typography.font.FontStyle,
      },
      FontVariant: {
        name: 'Font Variant',
        Component: baseAnimatedProperties.typography.font.FontVariant,
      },
      FontWeight: {
        name: 'Font Weight',
        Component: baseAnimatedProperties.typography.font.FontWeight,
      },
    },
  },
  TextAlignment: {
    name: 'Text Alignment',
    routes: {
      TextAlign: {
        name: 'Text Align',
        Component: baseAnimatedProperties.typography.alignment.TextAlign,
      },
      VerticalAlign: {
        name: 'Vertical Align',
        labelTypes: ['web'],
        Component: baseAnimatedProperties.typography.alignment.VerticalAlign,
      },
      TextAlignVertical: {
        name: 'Text Align Vertical',
        labelTypes: ['Android'],
        Component:
          baseAnimatedProperties.typography.alignment.TextAlignVertical,
      },
    },
  },
  TextDecoration: {
    name: 'Text Decoration',
    routes: {
      LetterSpacing: {
        name: 'Letter Spacing',
        Component: baseAnimatedProperties.typography.decoration.LetterSpacing,
      },
      LineHeight: {
        name: 'Line Height',
        Component: baseAnimatedProperties.typography.decoration.LineHeight,
      },
      TextTransform: {
        name: 'Text Transform',
        Component: baseAnimatedProperties.typography.decoration.TextTransform,
      },
      TextDecorationLine: {
        name: 'Text Decoration Line',
        Component:
          baseAnimatedProperties.typography.decoration.TextDecorationLine,
      },
      TextDecorationColor: {
        name: 'Text Decoration Color',
        labelTypes: ['iOS', 'web'],
        Component:
          baseAnimatedProperties.typography.decoration.TextDecorationColor,
      },
      TextDecorationStyle: {
        name: 'Text Decoration Style',
        labelTypes: ['iOS', 'web'],
        Component:
          baseAnimatedProperties.typography.decoration.TextDecorationStyle,
      },
    },
  },
  Others: {
    name: 'Others',
    routes: {
      UserSelect: {
        name: 'User Select',
        labelTypes: ['web'],
        Component: baseAnimatedProperties.typography.others.UserSelect,
      },
      IncludeFontPadding: {
        name: 'Include Font Padding',
        labelTypes: ['Android'],
        Component: baseAnimatedProperties.typography.others.IncludeFontPadding,
      },
    },
  },
} satisfies Routes;

const othersRoutes = {
  Image: {
    name: 'Image',
    routes: {
      ResizeMode: {
        name: 'Resize Mode',
        labelTypes: ['iOS', 'Android'],
        Component: baseAnimatedProperties.others.image.ResizeMode,
      },
    },
  },
  Cursor: {
    name: 'Cursor',
    routes: {
      Cursor: {
        name: 'Cursor',
        Component: baseAnimatedProperties.others.cursor.Cursor,
      },
      PointerEvents: {
        name: 'Pointer Events',
        Component: baseAnimatedProperties.others.cursor.PointerEvents,
      },
    },
  },
  Filter: {
    name: 'Filter',
    labelTypes: ['web'],
    Component: baseAnimatedProperties.others.Filter,
  },
} satisfies Routes;

export const basePropertiesRoutes = {
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
} satisfies Routes;
