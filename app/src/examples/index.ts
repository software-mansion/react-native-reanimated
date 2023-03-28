import AnimatedKeyboardExample from './AnimatedKeyboardExample';
import AnimatedListExample from './LayoutAnimations/AnimatedList';
import AnimatedSensorExample from './AnimatedSensorExample';
import AnimatedStyleUpdateExample from './AnimatedStyleUpdateExample';
import AnimatedTabBarExample from './AnimatedTabBarExample';
import AnimatedTextInputExample from './AnimatedTextInputExample';
import AnimatedTextWidthExample from './AnimatedTextWidthExample';
import ArticleProgressExample from './ArticleProgressExample';
import BasicLayoutAnimation from './LayoutAnimations/BasicLayoutAnimation';
import BasicNestedAnimation from './LayoutAnimations/BasicNestedAnimation';
import BasicNestedLayoutAnimation from './LayoutAnimations/BasicNestedLayoutAnimation';
import BokehExample from './BokehExample';
import BouncingBoxExample from './BouncingBoxExample';
import BubblesExample from './BubblesExample';
import CardExample from './SharedElementTransitions/Card';
import Carousel from './LayoutAnimations/Carousel';
import ChatHeadsExample from './ChatHeadsExample';
import ChessboardExample from './ChessboardExample';
import ColorExample from './ColorExample';
import ColorInterpolationExample from './ColorInterpolationExample';
import CombinedTest from './LayoutAnimations/Combined';
import ConfigExample from './ConfigExample';
import CubesExample from './CubesExample';
import CustomLayoutAnimationScreen from './LayoutAnimations/CustomLayout';
import CustomTransitionExample from './SharedElementTransitions/CustomTransition';
import DefaultAnimations from './LayoutAnimations/DefaultAnimations';
import DeleteAncestorOfExiting from './LayoutAnimations/DeleteAncestorOfExiting';
import DragAndSnapExample from './DragAndSnapExample';
import EmojiWaterfallExample from './EmojiWaterfallExample';
import EmptyExample from './EmptyExample';
import ExtrapolationExample from './ExtrapolationExample';
import FlatListExample from './SharedElementTransitions/FlatList';
import FrameCallbackExample from './FrameCallbackExample';
import GalleryExample from './SharedElementTransitions/Gallery';
import GestureHandlerExample from './GestureHandlerExample';
import IPodExample from './IPodExample';
import ImageStackExample from './SharedElementTransitions/ImageStack';
import InvertedFlatListExample from './InvertedFlatListExample';
import KeyframeAnimation from './LayoutAnimations/KeyframeAnimation';
import LayoutAnimationExample from './SharedElementTransitions/LayoutAnimation';
import LightBoxExample from './LightBoxExample';
import LiquidSwipe from './LiquidSwipe/LiquidSwipe';
import ManyScreensExample from './SharedElementTransitions/ManyScreens';
import ManyTagsExample from './SharedElementTransitions/ManyTags';
import MeasureExample from './MeasureExample';
import Modal from './LayoutAnimations/Modal';
import ModalNewAPI from './LayoutAnimations/ModalNewAPI';
import ModalsExample from './SharedElementTransitions/Modals';
import MountingUnmounting from './LayoutAnimations/MountingUnmounting';
import NativeModals from './LayoutAnimations/NativeModals';
import NestedNativeStacksWithLayout from './LayoutAnimations/NestedNativeStacksWithLayout';
import NestedStacksExample from './SharedElementTransitions/NestedStacks';
import NestedTest from './LayoutAnimations/Nested';
import NewestShadowNodesRegistryRemoveExample from './NewestShadowNodesRegistryRemoveExample';
import OldAnimatedSensorExample from './OldAnimatedSensorExample';
import OldMeasureExample from './OldMeasureExample';
import OlympicAnimation from './LayoutAnimations/OlympicAnimation';
import OverlappingBoxesExample from './OverlappingBoxesExample';
import PagerExample from './CustomHandler/PagerExample';
import PinExample from './PinExample';
import ReactionsCounterExample from './LayoutAnimations/ReactionsCounterExample';
import RefExample from './RefExample';
import RestoreStateExample from './SharedElementTransitions/RestoreState';
import ScreenStackExample from './ScreenStackExample';
import ScreenStackHeaderConfigBackgroundColorExample from './ScreenStackHeaderConfigBackgroundColorExample';
import ScrollEventExample from './ScrollEventExample';
import ScrollToExample from './ScrollToExample';
import ScrollViewExample from './ScrollViewExample';
import ScrollViewOffsetExample from './ScrollViewOffsetExample';
import ScrollableViewExample from './ScrollableViewExample';
import SharedStyleExample from './SharedStyleExample';
import SpringLayoutAnimation from './LayoutAnimations/SpringLayoutAnimation';
import SvgExample from './SvgExample';
import SwipeableList from './LayoutAnimations/SwipeableList';
import SwipeableListExample from './SwipeableListExample';
import TransformExample from './TransformExample';
import WaterfallGridExample from './LayoutAnimations/WaterfallGridExample';
import WidthExample from './WidthExample';
import WithoutBabelPluginExample from './WithoutBabelPluginExample';
import WobbleExample from './WobbleExample';
import WorkletExample from './WorkletExample';

interface Example {
  icon: string;
  title: string;
  screen: React.FC;
}

export const EXAMPLES: Record<string, Example> = {
  IPodExample: {
    icon: '🎧',
    title: 'iPod example',
    screen: IPodExample,
  },
  SharedStyleExample: {
    icon: '',
    title: 'Shared style example',
    screen: SharedStyleExample,
  },
  AnimatedStyleUpdateExample: {
    icon: '',
    title: 'Animated style update example',
    screen: AnimatedStyleUpdateExample,
  },
  AnimatedTabBarExample: {
    icon: '',
    title: 'Animated tab bar example',
    screen: AnimatedTabBarExample,
  },
  ChatHeadsExample: {
    icon: '',
    title: 'Chat heads example',
    screen: ChatHeadsExample,
  },
  CubesExample: {
    icon: '',
    title: 'Cubes example',
    screen: CubesExample,
  },
  DragAndSnapExample: {
    icon: '',
    title: 'Drag and snap example',
    screen: DragAndSnapExample,
  },
  ColorInterpolationExample: {
    icon: '',
    title: 'Color interpolation example',
    screen: ColorInterpolationExample,
  },
  EmojiWaterfallExample: {
    icon: '',
    title: 'Emoji waterfall example',
    screen: EmojiWaterfallExample,
  },
  ExtrapolationExample: {
    icon: '',
    title: 'Extrapolation example',
    screen: ExtrapolationExample,
  },
  InvertedFlatListExample: {
    icon: '',
    title: 'Inverted FlatList example',
    screen: InvertedFlatListExample,
  },
  OldAnimatedSensorExample: {
   icon: '',
   title: 'Old animated sensor example',
   screen: OldAnimatedSensorExample,
  },
  OldMeasureExample: {
    icon: '',
    title: 'Old measure example',
    screen: OldMeasureExample,
  },
  PinExample: {
    icon: '',
    title: 'PIN example',
    screen: PinExample,
  },
  ScrollableViewExample: {
    icon: '',
    title: 'Scrollable view example',
    screen: ScrollableViewExample,
  },
  ScrollEventExample: {
    icon: '',
    title: 'Scroll event example',
    screen: ScrollEventExample,
  },
  SwipeableListExample: {
    icon: '',
    title: 'Swipeable list example',
    screen: SwipeableListExample,
  },
  WobbleExample: {
    icon: '',
    title: 'Wobble example',
    screen: WobbleExample,
  },
  LightBoxExample: {
    icon: '🖼️',
    title: 'LightBox example',
    screen: LightBoxExample,
  },
  LiquidSwipe: {
    icon: '♣️',
    title: 'Liquid swipe example',
    screen: LiquidSwipe,
  },
  PagerExample: {
    icon: '📟',
    title: 'Pager example',
    screen: PagerExample,
  },
  DeleteAncestorOfExiting: {
    icon: '',
    title: '[LA] Deleting view with an exiting animation',
    screen: DeleteAncestorOfExiting,
  },
  NestedNativeStacksWithLayout: {
    icon: '',
    title: '[LA] Nested NativeStacks with layout',
    screen: NestedNativeStacksWithLayout,
  },
  BasicLayoutAnimation: {
    icon: '',
    title: '[LA] Basic layout animation',
    screen: BasicLayoutAnimation,
  },
  BasicNestedAnimation: {
    icon: '',
    title: '[LA] Basic nested animation',
    screen: BasicNestedAnimation,
  },
  BasicNestedLayoutAnimation: {
    icon: '',
    title: '[LA] Basic nested layout animation',
    screen: BasicNestedLayoutAnimation,
  },
  NestedLayoutAnimations: {
    icon: '',
    title: '[LA] Nested layout animations',
    screen: NestedTest,
  },
  CombinedLayoutAnimations: {
    icon: '',
    title: '[LA] Entering and Exiting with Layout',
    screen: CombinedTest,
  },
  DefaultAnimations: {
    icon: '',
    title: '[LA] Default layout animations',
    screen: DefaultAnimations,
  },
  DefaultTransitions: {
    icon: '',
    title: '[LA] Default layout transitions',
    screen: WaterfallGridExample,
  },
  KeyframeAnimation: {
    icon: '',
    title: '[LA] Keyframe animation',
    screen: KeyframeAnimation,
  },
  ParticipantList: {
    icon: '',
    title: '[LA] Participant List',
    screen: AnimatedListExample,
  },
  OlympicAnimation: {
    icon: '',
    title: '[LA] Olympic animation',
    screen: OlympicAnimation,
  },
  CustomLayoutAnimation: {
    icon: '',
    title: '[LA] Custom layout animation',
    screen: CustomLayoutAnimationScreen,
  },
  ModalNewAPI: {
    icon: '',
    title: '[LA] ModalNewAPI',
    screen: ModalNewAPI,
  },
  SpringLayoutAnimation: {
    icon: '',
    title: '[LA] Spring Layout Animation',
    screen: SpringLayoutAnimation,
  },
  MountingUnmounting: {
    icon: '',
    title: '[LA] Mounting Unmounting',
    screen: MountingUnmounting,
  },
  ReactionsCounterExample: {
    icon: '',
    title: '[LA] Reactions counter',
    screen: ReactionsCounterExample,
  },
  SwipeableList: {
    icon: '',
    title: '[LA] Swipeable list',
    screen: SwipeableList,
  },
  Modal: {
    icon: '',
    title: '[LA] Modal',
    screen: Modal,
  },
  NativeModals: {
    icon: '',
    title: '[LA] Native modals (RN and Screens)',
    screen: NativeModals,
  },
  Carousel: {
    icon: '',
    title: '[LA] Carousel',
    screen: Carousel,
  },
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
