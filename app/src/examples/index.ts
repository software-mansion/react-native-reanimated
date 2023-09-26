import AboutExample from './AboutExample';
import AnimatableRefExample from './AnimatableRefExample';
import AnimatedKeyboardExample from './AnimatedKeyboardExample';
import AnimatedListExample from './LayoutAnimations/AnimatedList';
import AnimatedSensorAccelerometerExample from './AnimatedSensorAccelerometerExample';
import AnimatedSensorGravityExample from './AnimatedSensorGravityExample';
import AnimatedSensorGyroscopeExample from './AnimatedSensorGyroscopeExample';
import AnimatedSensorMagneticFieldExample from './AnimatedSensorMagneticFieldExample';
import AnimatedSensorRotationExample from './AnimatedSensorRotationExample';
import AnimatedStyleUpdateExample from './AnimatedStyleUpdateExample';
import AnimatedTabBarExample from './AnimatedTabBarExample';
import AnimatedTextInputExample from './AnimatedTextInputExample';
import AnimatedTextWidthExample from './AnimatedTextWidthExample';
import ArticleProgressExample from './ArticleProgressExample';
import BabelVersionCheckExample from './BabelVersionCheckExample';
import BasicLayoutAnimation from './LayoutAnimations/BasicLayoutAnimation';
import BasicNestedAnimation from './LayoutAnimations/BasicNestedAnimation';
import BasicNestedLayoutAnimation from './LayoutAnimations/BasicNestedLayoutAnimation';
import BilliardExample from './BilliardExample';
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
import CubesExample from './CubesExample';
import CustomLayoutAnimationScreen from './LayoutAnimations/CustomLayout';
import CustomTransitionExample from './SharedElementTransitions/CustomTransition';
import DefaultAnimations from './LayoutAnimations/DefaultAnimations';
import DeleteAncestorOfExiting from './LayoutAnimations/DeleteAncestorOfExiting';
import DispatchCommandExample from './DispatchCommandExample';
import DragAndSnapExample from './DragAndSnapExample';
import DuplicateTagsExample from './SharedElementTransitions/DuplicateTags';
import EmojiWaterfallExample from './EmojiWaterfallExample';
import EmptyExample from './EmptyExample';
import ExtrapolationExample from './ExtrapolationExample';
import FlatListExample from './SharedElementTransitions/FlatList';
import FrameCallbackExample from './FrameCallbackExample';
import GalleryExample from './SharedElementTransitions/Gallery';
import GestureHandlerExample from './GestureHandlerExample';
import GetViewPropExample from './GetViewPropExample';
import IPodExample from './IPodExample';
import ImageStackExample from './SharedElementTransitions/ImageStack';
import InvertedFlatListExample from './InvertedFlatListExample';
import KeyframeAnimation from './LayoutAnimations/KeyframeAnimation';
import LayoutAnimationExample from './SharedElementTransitions/LayoutAnimation';
import LettersExample from './LettersExample';
import LightBoxExample from './LightBoxExample';
import LiquidSwipe from './LiquidSwipe/LiquidSwipe';
import LogExample from './LogExample';
import ManyScreensExample from './SharedElementTransitions/ManyScreens';
import ManyTagsExample from './SharedElementTransitions/ManyTags';
import MatrixTransform from './MatrixTransform';
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
import NonLayoutPropAndRenderExample from './NonLayoutPropAndRenderExample';
import OldAnimatedSensorExample from './OldAnimatedSensorExample';
import OldMeasureExample from './OldMeasureExample';
import OlympicAnimation from './LayoutAnimations/OlympicAnimation';
import OverlappingBoxesExample from './OverlappingBoxesExample';
import PagerExample from './CustomHandler/PagerExample';
import PendulumExample from './PendulumExample';
import PinExample from './PinExample';
import ProfilesExample from './SharedElementTransitions/Profiles';
import ProgressTransitionExample from './SharedElementTransitions/ProgressTransition';
import RainbowExample from './RainbowExample';
import ReactionsCounterExample from './LayoutAnimations/ReactionsCounterExample';
import ReducedMotionExample from './ReducedMotionExample';
import ReducedMotionLayoutExample from './LayoutAnimations/ReducedMotionLayoutExample';
import ReducedMotionSharedExample from './SharedElementTransitions/ReducedMotionSharedExample';
import RefExample from './RefExample';
import RestoreStateExample from './SharedElementTransitions/RestoreState';
import TransitionRestartExample from './SharedElementTransitions/TransitionRestart';
import ScreenStackExample from './ScreenStackExample';
import ScreenStackHeaderConfigBackgroundColorExample from './ScreenStackHeaderConfigBackgroundColorExample';
import ScrollEventExample from './ScrollEventExample';
import ScrollToExample from './ScrollToExample';
import ScrollViewExample from './ScrollViewExample';
import ScrollViewOffsetExample from './ScrollViewOffsetExample';
import ScrollableViewExample from './ScrollableViewExample';
import SetNativePropsExample from './SetNativePropsExample';
import SharedStyleExample from './SharedStyleExample';
import SpringLayoutAnimation from './LayoutAnimations/SpringLayoutAnimation';
import SvgExample from './SvgExample';
import SwipeableList from './LayoutAnimations/SwipeableList';
import SwipeableListExample from './SwipeableListExample';
import TransformExample from './TransformExample';
import UpdatePropsPerfExample from './UpdatePropsPerfExample';
import VolumeExample from './VolumeExample';
import WaterfallGridExample from './LayoutAnimations/WaterfallGridExample';
import WidthExample from './WidthExample';
import WithoutBabelPluginExample from './WithoutBabelPluginExample';
import WobbleExample from './WobbleExample';
import WorkletExample from './WorkletExample';
import WorkletRuntimeExample from './WorkletRuntimeExample';

interface Example {
  icon?: string;
  title: string;
  screen: React.FC;
}

export const EXAMPLES: Record<string, Example> = {
  // Empty example for test purposes

  EmptyExample: {
    icon: '👻',
    title: 'Empty',
    screen: EmptyExample,
  },
  WorkletRuntimeExample: {
    icon: '🏃‍♂️',
    title: 'Worklet runtime',
    screen: WorkletRuntimeExample,
  },

  // About

  AboutExample: {
    icon: 'ℹ️',
    title: 'About',
    screen: AboutExample,
  },

  // Showcase

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
  IPodExample: {
    icon: '🎧',
    title: 'iPod',
    screen: IPodExample,
  },
  BilliardExample: {
    icon: '🎱',
    title: 'Billiard',
    screen: BilliardExample,
  },
  EmojiWaterfallExample: {
    icon: '💸',
    title: 'Emoji waterfall',
    screen: EmojiWaterfallExample,
  },
  LightBoxExample: {
    icon: '📷',
    title: 'Camera roll',
    screen: LightBoxExample,
  },
  LiquidSwipe: {
    icon: '♠️',
    title: 'Liquid swipe',
    screen: LiquidSwipe,
  },
  SwipeableListExample: {
    icon: '📞',
    title: 'Swipeable list',
    screen: SwipeableListExample,
  },
  ArticleProgressExample: {
    icon: '📰',
    title: 'Article progress',
    screen: ArticleProgressExample,
  },
  LettersExample: {
    icon: '📖',
    title: 'Letters',
    screen: LettersExample,
  },
  SetNativePropsExample: {
    icon: '🪄',
    title: 'setNativeProps',
    screen: SetNativePropsExample,
  },
  UpdatePropsPerfExample: {
    icon: '🏎️',
    title: 'Update props performance',
    screen: UpdatePropsPerfExample,
  },

  // Basic examples

  AnimatableRefExample: {
    icon: '⏬',
    title: 'Animate inner component',
    screen: AnimatableRefExample,
  },
  AnimatedTextInputExample: {
    icon: '🎰',
    title: 'Counter',
    screen: AnimatedTextInputExample,
  },
  AnimatedTextWidthExample: {
    icon: '✂️',
    title: 'Animate text width',
    screen: AnimatedTextWidthExample,
  },
  ColorExample: {
    icon: '🌈',
    title: 'Animate colors',
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
  AnimatedKeyboardExample: {
    icon: '⌨️',
    title: 'useAnimatedKeyboard',
    screen: AnimatedKeyboardExample,
  },
  AnimatedSensorAccelerometerExample: {
    icon: '🚀',
    title: 'useAnimatedSensor - accelerometer',
    screen: AnimatedSensorAccelerometerExample,
  },
  AnimatedSensorGyroscopeExample: {
    icon: '⚖️',
    title: 'useAnimatedSensor - gyroscope',
    screen: AnimatedSensorGyroscopeExample,
  },
  AnimatedSensorGravityExample: {
    icon: '🌎',
    title: 'useAnimatedSensor - gravity',
    screen: AnimatedSensorGravityExample,
  },
  AnimatedSensorMagneticFieldExample: {
    icon: '🧲',
    title: 'useAnimatedSensor - magnetic field',
    screen: AnimatedSensorMagneticFieldExample,
  },
  AnimatedSensorRotationExample: {
    icon: '🔄',
    title: 'useAnimatedSensor - rotation',
    screen: AnimatedSensorRotationExample,
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
  DispatchCommandExample: {
    icon: '🫡',
    title: 'Dispatch command',
    screen: DispatchCommandExample,
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
  BabelVersionCheckExample: {
    icon: '📦',
    title: 'Babel version check',
    screen: BabelVersionCheckExample,
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
  NonLayoutPropAndRenderExample: {
    icon: '🎭',
    title: 'Non-layout prop and render example',
    screen: NonLayoutPropAndRenderExample,
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
  RainbowExample: {
    icon: '🌈',
    title: 'Rainbow',
    screen: RainbowExample,
  },
  WithoutBabelPluginExample: {
    icon: '🔌',
    title: 'Without Babel plugin',
    screen: WithoutBabelPluginExample,
  },
  GalleryExample: {
    icon: '🇮🇹',
    title: 'Gallery',
    screen: GalleryExample,
  },
  ProfilesExample: {
    icon: '🙆‍♂️',
    title: 'Profiles',
    screen: ProfilesExample,
  },
  VolumeExample: {
    icon: '🎧',
    title: 'Volume slider & sensor',
    screen: VolumeExample,
  },
  ProgressTransitionExample: {
    icon: '☕',
    title: 'Progress transition',
    screen: ProgressTransitionExample,
  },
  MatrixExample: {
    icon: '🧮',
    title: 'useAnimatedStyle with matrix',
    screen: MatrixTransform,
  },
  SpringExample: {
    icon: '🕰',
    title: 'Pendulum example',
    screen: PendulumExample,
  },
  ReducedMotionExample: {
    icon: '⏸️',
    title: 'Reduced Motion',
    screen: ReducedMotionExample,
  },
  GetViewPropExample: {
    icon: '🔎',
    title: 'getViewProp',
    screen: GetViewPropExample,
  },
  LogExample: {
    icon: '⌨',
    title: 'Log test',
    screen: LogExample,
  },

  // Old examples

  AnimatedStyleUpdateExample: {
    title: 'Animated style update',
    screen: AnimatedStyleUpdateExample,
  },
  SharedStyleExample: {
    title: 'Shared style',
    screen: SharedStyleExample,
  },
  AnimatedTabBarExample: {
    title: 'Tab bar',
    screen: AnimatedTabBarExample,
  },
  ChatHeadsExample: {
    title: 'Chat heads',
    screen: ChatHeadsExample,
  },
  CubesExample: {
    title: 'Cubes',
    screen: CubesExample,
  },
  DragAndSnapExample: {
    title: 'Drag and snap',
    screen: DragAndSnapExample,
  },
  ColorInterpolationExample: {
    title: 'Color interpolation',
    screen: ColorInterpolationExample,
  },
  ExtrapolationExample: {
    title: 'Extrapolation example',
    screen: ExtrapolationExample,
  },
  InvertedFlatListExample: {
    title: 'Inverted FlatList example',
    screen: InvertedFlatListExample,
  },
  OldAnimatedSensorExample: {
    title: 'Old animated sensor example',
    screen: OldAnimatedSensorExample,
  },
  OldMeasureExample: {
    title: 'Accordion',
    screen: OldMeasureExample,
  },
  PinExample: {
    title: 'PIN example',
    screen: PinExample,
  },
  ScrollableViewExample: {
    title: 'Scrollable view example',
    screen: ScrollableViewExample,
  },
  ScrollEventExample: {
    title: 'Scroll event example',
    screen: ScrollEventExample,
  },
  WobbleExample: {
    title: 'Wobble example',
    screen: WobbleExample,
  },
  PagerExample: {
    title: 'Pager example',
    screen: PagerExample,
  },

  // Layout Animations

  DeleteAncestorOfExiting: {
    title: '[LA] Deleting view with an exiting animation',
    screen: DeleteAncestorOfExiting,
  },
  NestedNativeStacksWithLayout: {
    title: '[LA] Nested NativeStacks with layout',
    screen: NestedNativeStacksWithLayout,
  },
  BasicLayoutAnimation: {
    title: '[LA] Basic layout animation',
    screen: BasicLayoutAnimation,
  },
  BasicNestedAnimation: {
    title: '[LA] Basic nested animation',
    screen: BasicNestedAnimation,
  },
  BasicNestedLayoutAnimation: {
    title: '[LA] Basic nested layout animation',
    screen: BasicNestedLayoutAnimation,
  },
  NestedLayoutAnimations: {
    title: '[LA] Nested layout animations',
    screen: NestedTest,
  },
  CombinedLayoutAnimations: {
    title: '[LA] Entering and Exiting with Layout',
    screen: CombinedTest,
  },
  DefaultAnimations: {
    title: '[LA] Default layout animations',
    screen: DefaultAnimations,
  },
  DefaultTransitions: {
    title: '[LA] Default layout transitions',
    screen: WaterfallGridExample,
  },
  KeyframeAnimation: {
    title: '[LA] Keyframe animation',
    screen: KeyframeAnimation,
  },
  ParticipantList: {
    title: '[LA] Participant List',
    screen: AnimatedListExample,
  },
  OlympicAnimation: {
    title: '[LA] Olympic animation',
    screen: OlympicAnimation,
  },
  CustomLayoutAnimation: {
    title: '[LA] Custom layout animation',
    screen: CustomLayoutAnimationScreen,
  },
  ModalNewAPI: {
    title: '[LA] ModalNewAPI',
    screen: ModalNewAPI,
  },
  SpringLayoutAnimation: {
    title: '[LA] Spring Layout Animation',
    screen: SpringLayoutAnimation,
  },
  MountingUnmounting: {
    title: '[LA] Mounting Unmounting',
    screen: MountingUnmounting,
  },
  ReactionsCounterExample: {
    title: '[LA] Reactions counter',
    screen: ReactionsCounterExample,
  },
  SwipeableList: {
    title: '[LA] Swipeable list',
    screen: SwipeableList,
  },
  Modal: {
    title: '[LA] Modal',
    screen: Modal,
  },
  NativeModals: {
    title: '[LA] Native modals (RN and Screens)',
    screen: NativeModals,
  },
  Carousel: {
    title: '[LA] Carousel',
    screen: Carousel,
  },
  ReducedMotionLayoutExample: {
    title: '[LA] Reduced Motion',
    screen: ReducedMotionLayoutExample,
  },

  // Shared Element Transitions

  CardExample: {
    title: '[SET] Card',
    screen: CardExample,
  },
  CustomTransitionExample: {
    title: '[SET] Custom transition',
    screen: CustomTransitionExample,
  },
  LayoutAnimationExample: {
    title: '[SET] Layout Animation',
    screen: LayoutAnimationExample,
  },
  ManyScreensExample: {
    title: '[SET] Many screens',
    screen: ManyScreensExample,
  },
  ManyTagsExample: {
    title: '[SET] Many tags',
    screen: ManyTagsExample,
  },
  NestedStacksExample: {
    title: '[SET] Nested stacks',
    screen: NestedStacksExample,
  },
  ModalsExample: {
    title: '[SET] Modals',
    screen: ModalsExample,
  },
  FlatListExample: {
    title: '[SET] FlatList',
    screen: FlatListExample,
  },
  ImageStackExample: {
    title: '[SET] Image Stack',
    screen: ImageStackExample,
  },
  RestoreStateExample: {
    title: '[SET] Restore State',
    screen: RestoreStateExample,
  },
  DuplicateTagsExample: {
    title: '[SET] Duplicate Tags',
    screen: DuplicateTagsExample,
  },
  ReducedMotionSharedExample: {
    title: '[SET] Reduced Motion',
    screen: ReducedMotionSharedExample,
  },
  TransitionRestartExample: {
    title: '[SET] Transition Restart',
    screen: TransitionRestartExample,
  },
} as const;
