import { baseAnimatedProperties } from '@/apps/css/examples/animations/screens';
import type { Routes } from '@/apps/css/navigation/types';

const layoutAndPositioningRoutes = {
  Dimensions: {
    Component: baseAnimatedProperties.layoutAndPositioning.Dimensions,
    name: 'Dimensions',
  },
  FlexBox: {
    flatten: true,
    name: 'FlexBox',
    routes: {
      DiscreteProperties: {
        name: 'Discrete Properties',
        routes: {
          AlignContent: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.AlignContent,
            name: 'Align Content',
          },
          AlignItems: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.AlignItems,
            name: 'Align Items',
          },
          AlignSelf: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.AlignSelf,
            name: 'Align Self',
          },
          FlexDirection: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexDirection,
            name: 'Flex Direction',
          },
          FlexWrap: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexWrap,
            name: 'Flex Wrap',
          },
          JustifyContent: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox
                .JustifyContent,
            name: 'Justify Content',
          },
          LayoutDirection: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox
                .LayoutDirection,
            labelTypes: ['iOS', 'Android'],
            name: 'Layout Direction',
          },
        },
      },
      NumericProperties: {
        name: 'Numeric Properties',
        routes: {
          ColumnGap: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.ColumnGap,
            name: 'Column Gap',
          },
          End: {
            Component: baseAnimatedProperties.layoutAndPositioning.flexBox.End,
            labelTypes: ['iOS', 'Android'],
            name: 'End',
          },
          Flex: {
            Component: baseAnimatedProperties.layoutAndPositioning.flexBox.Flex,
            name: 'Flex',
          },
          FlexBasis: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexBasis,
            labelTypes: ['web'],
            name: 'Flex Basis',
          },
          FlexGrow: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexGrow,
            name: 'Flex Grow',
          },
          FlexShrink: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.FlexShrink,
            name: 'Flex Shrink',
          },
          Gap: {
            Component: baseAnimatedProperties.layoutAndPositioning.flexBox.Gap,
            name: 'Gap',
          },
          RowGap: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.RowGap,
            name: 'Row Gap',
          },
          Start: {
            Component:
              baseAnimatedProperties.layoutAndPositioning.flexBox.Start,
            labelTypes: ['iOS', 'Android'],
            name: 'Start',
          },
        },
      },
    },
  },
  Insets: {
    Component: baseAnimatedProperties.layoutAndPositioning.Insets,
    name: 'Insets',
  },
  Margins: {
    Component: baseAnimatedProperties.layoutAndPositioning.Margins,
    name: 'Margins',
  },
  Others: {
    name: 'Others',
    routes: {
      AspectRatio: {
        Component:
          baseAnimatedProperties.layoutAndPositioning.others.AspectRatio,
        name: 'Aspect Ratio',
      },
      BoxSizing: {
        Component: baseAnimatedProperties.layoutAndPositioning.others.BoxSizing,
        labelTypes: ['web'],
        name: 'Box Sizing',
      },
      Display: {
        Component: baseAnimatedProperties.layoutAndPositioning.others.Display,
        name: 'Display',
      },
      Overflow: {
        Component: baseAnimatedProperties.layoutAndPositioning.others.Overflow,
        name: 'Overflow',
      },
      Position: {
        Component: baseAnimatedProperties.layoutAndPositioning.others.Position,
        name: 'Position',
      },
      ZIndex: {
        Component: baseAnimatedProperties.layoutAndPositioning.others.ZIndex,
        name: 'Z-index',
      },
    },
  },
  Paddings: {
    Component: baseAnimatedProperties.layoutAndPositioning.Paddings,
    name: 'Paddings',
  },
} satisfies Routes;

const appearanceRoutes = {
  Borders: {
    name: 'Borders',
    routes: {
      BorderRadius: {
        Component: baseAnimatedProperties.appearance.borders.BorderRadius,
        name: 'Border Radius',
      },
      BorderStyle: {
        Component: baseAnimatedProperties.appearance.borders.BorderStyle,
        name: 'Border Style',
      },
      BorderWidth: {
        Component: baseAnimatedProperties.appearance.borders.BorderWidth,
        name: 'Border Width',
      },
    },
  },
  Colors: {
    name: 'Colors',
    routes: {
      ColorFormats: {
        Component: baseAnimatedProperties.appearance.colors.ColorFormats,
        name: 'Color Formats',
      },
      ColorProperties: {
        Component: baseAnimatedProperties.appearance.colors.ColorProperties,
        name: 'Color Properties',
      },
    },
  },
  Filter: {
    Component: baseAnimatedProperties.appearance.Filter,
    name: 'Filter',
  },
  Others: {
    name: 'Others',
    routes: {
      BackfaceVisibility: {
        Component: baseAnimatedProperties.appearance.others.BackfaceVisibility,
        name: 'Backface Visibility',
      },
      MixBlendMode: {
        Component: baseAnimatedProperties.appearance.others.MixBlendMode,
        name: 'Mix Blend Mode',
      },
      Opacity: {
        Component: baseAnimatedProperties.appearance.others.Opacity,
        name: 'Opacity',
      },
    },
  },
  Outlines: {
    name: 'Outlines',
    routes: {
      OutlineOffset: {
        Component: baseAnimatedProperties.appearance.outlines.OutlineOffset,
        name: 'Outline Offset',
      },
      OutlineStyle: {
        Component: baseAnimatedProperties.appearance.outlines.OutlineStyle,
        name: 'Outline Style',
      },
      OutlineWidth: {
        Component: baseAnimatedProperties.appearance.outlines.OutlineWidth,
        name: 'Outline Width',
      },
    },
  },
  Shadows: {
    flatten: true,
    name: 'Shadows',
    routes: {
      CombinedShadows: {
        name: 'Combined Shadows',
        routes: {
          BoxShadow: {
            Component: baseAnimatedProperties.appearance.shadows.BoxShadow,
            name: 'Box Shadow',
          },
        },
      },
      TextShadow: {
        name: 'Text Shadow',
        routes: {
          TextShadowColor: {
            Component:
              baseAnimatedProperties.appearance.shadows.TextShadowColor,
            name: 'Text Shadow Color',
          },
          TextShadowOffset: {
            Component:
              baseAnimatedProperties.appearance.shadows.TextShadowOffset,
            name: 'Text Shadow Offset',
          },
          TextShadowRadius: {
            Component:
              baseAnimatedProperties.appearance.shadows.TextShadowRadius,
            name: 'Text Shadow Radius',
          },
        },
      },
      ViewShadow: {
        name: 'View Shadow',
        routes: {
          Elevation: {
            Component: baseAnimatedProperties.appearance.shadows.Elevation,
            labelTypes: ['Android'],
            name: 'Elevation',
          },
          ShadowColor: {
            Component: baseAnimatedProperties.appearance.shadows.ShadowColor,
            name: 'Shadow Color',
          },
          ShadowOffset: {
            Component: baseAnimatedProperties.appearance.shadows.ShadowOffset,
            labelTypes: ['iOS', 'web'],
            name: 'Shadow Offset',
          },
          ShadowOpacity: {
            Component: baseAnimatedProperties.appearance.shadows.ShadowOpacity,
            labelTypes: ['iOS', 'web'],
            name: 'Shadow Opacity',
          },
          ShadowRadius: {
            Component: baseAnimatedProperties.appearance.shadows.ShadowRadius,
            labelTypes: ['iOS', 'web'],
            name: 'Shadow Radius',
          },
        },
      },
    },
  },
  Transforms: {
    flatten: true,
    name: 'Transforms',
    routes: {
      RelatedProperties: {
        name: 'Related Properties',
        routes: {
          TransformOrigin: {
            Component:
              baseAnimatedProperties.appearance.transforms.relatedProperties
                .TransformOrigin,
            name: 'Transform Origin',
          },
        },
      },
      TransformProperties: {
        name: 'Transform Properties',
        routes: {
          Matrix: {
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Matrix,
            name: 'Matrix',
          },
          Perspective: {
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Perspective,
            name: 'Perspective',
          },
          Rotate: {
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Rotate,
            name: 'Rotate',
          },
          Scale: {
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Scale,
            name: 'Scale',
          },
          Skew: {
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Skew,
            name: 'Skew',
          },
          Translate: {
            Component:
              baseAnimatedProperties.appearance.transforms.transformProperties
                .Translate,
            name: 'Translate',
          },
        },
      },
    },
  },
} satisfies Routes;

const typographyRoutes = {
  Font: {
    name: 'Font',
    routes: {
      FontFamily: {
        Component: baseAnimatedProperties.typography.font.FontFamily,
        name: 'Font Family',
      },
      FontSize: {
        Component: baseAnimatedProperties.typography.font.FontSize,
        name: 'Font Size',
      },
      FontStyle: {
        Component: baseAnimatedProperties.typography.font.FontStyle,
        name: 'Font Style',
      },
      FontVariant: {
        Component: baseAnimatedProperties.typography.font.FontVariant,
        name: 'Font Variant',
      },
      FontWeight: {
        Component: baseAnimatedProperties.typography.font.FontWeight,
        name: 'Font Weight',
      },
    },
  },
  Others: {
    name: 'Others',
    routes: {
      IncludeFontPadding: {
        Component: baseAnimatedProperties.typography.others.IncludeFontPadding,
        labelTypes: ['Android'],
        name: 'Include Font Padding',
      },
      UserSelect: {
        Component: baseAnimatedProperties.typography.others.UserSelect,
        labelTypes: ['web'],
        name: 'User Select',
      },
    },
  },
  TextAlignment: {
    name: 'Text Alignment',
    routes: {
      TextAlign: {
        Component: baseAnimatedProperties.typography.alignment.TextAlign,
        name: 'Text Align',
      },
      TextAlignVertical: {
        Component:
          baseAnimatedProperties.typography.alignment.TextAlignVertical,
        labelTypes: ['Android'],
        name: 'Text Align Vertical',
      },
      VerticalAlign: {
        Component: baseAnimatedProperties.typography.alignment.VerticalAlign,
        labelTypes: ['web'],
        name: 'Vertical Align',
      },
    },
  },
  TextDecoration: {
    name: 'Text Decoration',
    routes: {
      LetterSpacing: {
        Component: baseAnimatedProperties.typography.decoration.LetterSpacing,
        name: 'Letter Spacing',
      },
      LineHeight: {
        Component: baseAnimatedProperties.typography.decoration.LineHeight,
        name: 'Line Height',
      },
      TextDecorationColor: {
        Component:
          baseAnimatedProperties.typography.decoration.TextDecorationColor,
        labelTypes: ['iOS', 'web'],
        name: 'Text Decoration Color',
      },
      TextDecorationLine: {
        Component:
          baseAnimatedProperties.typography.decoration.TextDecorationLine,
        name: 'Text Decoration Line',
      },
      TextDecorationStyle: {
        Component:
          baseAnimatedProperties.typography.decoration.TextDecorationStyle,
        labelTypes: ['iOS', 'web'],
        name: 'Text Decoration Style',
      },
      TextTransform: {
        Component: baseAnimatedProperties.typography.decoration.TextTransform,
        name: 'Text Transform',
      },
    },
  },
} satisfies Routes;

const othersRoutes = {
  Cursor: {
    name: 'Cursor',
    routes: {
      Cursor: {
        Component: baseAnimatedProperties.others.cursor.Cursor,
        name: 'Cursor',
      },
      PointerEvents: {
        Component: baseAnimatedProperties.others.cursor.PointerEvents,
        name: 'Pointer Events',
      },
    },
  },
  Image: {
    name: 'Image',
    routes: {
      ResizeMode: {
        Component: baseAnimatedProperties.others.image.ResizeMode,
        labelTypes: ['iOS', 'Android'],
        name: 'Resize Mode',
      },
    },
  },
} satisfies Routes;

export const basePropertiesRoutes = {
  Appearance: {
    name: 'Appearance',
    routes: appearanceRoutes,
  },
  LayoutAndPositioning: {
    name: 'Layout and Positioning',
    routes: layoutAndPositioningRoutes,
  },
  Others: {
    name: 'Others',
    routes: othersRoutes,
  },
  Typography: {
    name: 'Typography',
    routes: typographyRoutes,
  },
} satisfies Routes;
