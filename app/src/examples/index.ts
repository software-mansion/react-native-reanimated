import AnimatedKeyboardExample from './AnimatedKeyboardExample';
import AnimatedSensorExample from './AnimatedSensorExample';
import AnimatedTextInputExample from './AnimatedTextInputExample';
import AnimatedTextWidthExample from './AnimatedTextWidthExample';
import ArticleProgressExample from './ArticleProgressExample';
import BokehExample from './BokehExample';
import BouncingBoxExample from './BouncingBoxExample';
import BubblesExample from './BubblesExample';
import CardExample from './SharedElementTransitions/Card';
import ChessboardExample from './ChessboardExample';
import ColorExample from './ColorExample';
import ConfigExample from './ConfigExample';
import CustomTransitionExample from './SharedElementTransitions/CustomTransition';
import EmptyExample from './EmptyExample';
import FlatListExample from './SharedElementTransitions/FlatList';
import FrameCallbackExample from './FrameCallbackExample';
import GalleryExample from './SharedElementTransitions/Gallery';
import GestureHandlerExample from './GestureHandlerExample';
import ImageStackExample from './SharedElementTransitions/ImageStack';
import LayoutAnimationExample from './SharedElementTransitions/LayoutAnimation';
import ManyScreensExample from './SharedElementTransitions/ManyScreens';
import ManyTagsExample from './SharedElementTransitions/ManyTags';
import MeasureExample from './MeasureExample';
import ModalsExample from './SharedElementTransitions/Modals';
import NestedStacksExample from './SharedElementTransitions/NestedStacks';
import NewestShadowNodesRegistryRemoveExample from './NewestShadowNodesRegistryRemoveExample';
import OverlappingBoxesExample from './OverlappingBoxesExample';
import RefExample from './RefExample';
import RestoreStateExample from './SharedElementTransitions/RestoreState';
import ScreenStackExample from './ScreenStackExample';
import ScreenStackHeaderConfigBackgroundColorExample from './ScreenStackHeaderConfigBackgroundColorExample';
import ScrollToExample from './ScrollToExample';
import ScrollViewExample from './ScrollViewExample';
import ScrollViewOffsetExample from './ScrollViewOffsetExample';
import SvgExample from './SvgExample';
import TransformExample from './TransformExample';
import WidthExample from './WidthExample';
import WithoutBabelPluginExample from './WithoutBabelPluginExample';
import WorkletExample from './WorkletExample';

interface Example {
  icon: string;
  title: string;
  screen: React.FC;
}

export const EXAMPLES: Record<string, Example> = {
  CardExample: {
    icon: '',
    title: '[SET] Card',
    screen: CardExample,
  },
  CustomTransitionExample: {
    icon: '',
    title: '[SET] Custom transition',
    screen: CustomTransitionExample,
  },
  GalleryExample: {
    icon: '',
    title: '[SET] Gallery',
    screen: GalleryExample,
  },
  LayoutAnimationExample: {
    icon: '',
    title: '[SET] Layout Animation',
    screen: LayoutAnimationExample,
  },
  ManyScreensExample: {
    icon: '',
    title: '[SET] Many screens',
    screen: ManyScreensExample,
  },
  ManyTagsExample: {
    icon: '',
    title: '[SET] Many tags',
    screen: ManyTagsExample,
  },
  NestedStacksExample: {
    icon: '',
    title: '[SET] Nested stacks',
    screen: NestedStacksExample,
  },
  ModalsExample: {
    icon: '',
    title: '[SET] Modals',
    screen: ModalsExample,
  },
  FlatListExample: {
    icon: '',
    title: '[SET] FlatList',
    screen: FlatListExample,
  },
  ImageStackExample: {
    icon: '',
    title: '[SET] Image Stack',
    screen: ImageStackExample,
  },
  RestoreStateExample: {
    icon: '',
    title: '[SET] Restore State',
    screen: RestoreStateExample,
  },
  ConfigExample: {
    icon: '⚙️',
    title: 'Config example',
    screen: ConfigExample,
  },
  WithoutBabelPluginExample: {
    icon: '🔌',
    title: 'Without Babel plugin example',
    screen: WithoutBabelPluginExample,
  },
  AnimatedKeyboardExample: {
    icon: '⌨️',
    title: 'Animated keyboard example',
    screen: AnimatedKeyboardExample,
  },
  AnimatedTextInputExample: {
    icon: '🎰',
    title: 'Animated.TextInput value',
    screen: AnimatedTextInputExample,
  },
  AnimatedTextWidthExample: {
    icon: '✂️',
    title: 'Animated.Text width',
    screen: AnimatedTextWidthExample,
  },
  BokehExample: {
    icon: '✨',
    title: 'Bokeh',
    screen: BokehExample,
  },
  BubblesExample: {
    icon: '🫧',
    title: 'Bubbles',
    screen: BubblesExample,
  },
  ColorExample: {
    icon: '🌈',
    title: 'Colors',
    screen: ColorExample,
  },
  ScreenStackHeaderConfigBackgroundColorExample: {
    icon: '🎨',
    title: 'Screen header background color',
    screen: ScreenStackHeaderConfigBackgroundColorExample,
  },
  ScreenStackExample: {
    icon: '🥞',
    title: 'Screen stack',
    screen: ScreenStackExample,
  },
  GestureHandlerExample: {
    icon: '👌',
    title: 'Draggable circle',
    screen: GestureHandlerExample,
  },
  SvgExample: {
    icon: '🟢',
    title: 'Animated SVG circle',
    screen: SvgExample,
  },
  BouncingBoxExample: {
    icon: '📦',
    title: 'Bouncing box',
    screen: BouncingBoxExample,
  },
  AnimatedSensorExample: {
    icon: '📡',
    title: 'useAnimatedSensor',
    screen: AnimatedSensorExample,
  },
  FrameCallbackExample: {
    icon: '🗣',
    title: 'useFrameCallback',
    screen: FrameCallbackExample,
  },
  ScrollViewExample: {
    icon: '📜',
    title: 'useAnimatedScrollHandler',
    screen: ScrollViewExample,
  },
  ScrollToExample: {
    icon: '🦘',
    title: 'scrollTo',
    screen: ScrollToExample,
  },
  ScrollViewOffsetExample: {
    icon: '𝌍',
    title: 'useScrollViewOffset',
    screen: ScrollViewOffsetExample,
  },
  ArticleProgressExample: {
    icon: '📰',
    title: 'Article progress',
    screen: ArticleProgressExample,
  },
  MeasureExample: {
    icon: '📐',
    title: 'measure',
    screen: MeasureExample,
  },
  WorkletExample: {
    icon: '🧵',
    title: 'runOnJS / runOnUI',
    screen: WorkletExample,
  },
  TransformExample: {
    icon: '🔄',
    title: 'Transform',
    screen: TransformExample,
  },
  WidthExample: {
    icon: '🌲',
    title: 'Layout props',
    screen: WidthExample,
  },
  RefExample: {
    icon: '🦑',
    title: 'forwardRef & useImperativeHandle',
    screen: RefExample,
  },
  ChessboardExample: {
    icon: '♟️',
    title: 'Chessboard',
    screen: ChessboardExample,
  },
  OverlappingBoxesExample: {
    icon: '🔝',
    title: 'z-index & elevation',
    screen: OverlappingBoxesExample,
  },
  NewestShadowNodesRegistryRemoveExample: {
    icon: '🌓',
    title: 'Conditional',
    screen: NewestShadowNodesRegistryRemoveExample,
  },
  EmptyExample: {
    icon: '👻',
    title: 'Empty',
    screen: EmptyExample,
  },
} as const;
