/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
import 'react-native-reanimated';
import React from 'react';
import type { Example, ExampleEntry } from '@/components';
import { REAPlatform } from '@/components';

const AboutExample: React.FC = () =>
  React.createElement(require('./AboutExample').default as React.FC);
const AmountExample: React.FC = () =>
  React.createElement(require('./AmountExample').default as React.FC);
const AndroidDrawPassExample: React.FC = () =>
  React.createElement(require('./AndroidDrawPassExample').default as React.FC);
const AnimatableRefExample: React.FC = () =>
  React.createElement(require('./AnimatableRefExample').default as React.FC);
const AnimatedPropsExample: React.FC = () =>
  React.createElement(require('./AnimatedPropsExample').default as React.FC);
const AnimatedSensorExample: React.FC = () =>
  React.createElement(require('./AnimatedSensorExample').default as React.FC);
const ArticleProgressExample: React.FC = () =>
  React.createElement(require('./ArticleProgressExample').default as React.FC);
const BBExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/BBExample').default as React.FC
  );
const BokehExample: React.FC = () =>
  React.createElement(require('./BokehExample').default as React.FC);
const BorderRadiiExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/BorderRadii').default
  );
const BottomSheetExample: React.FC = () =>
  React.createElement(require('./BottomSheetExample').default as React.FC);
const BottomTabsExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/BottomTabs').default as React.FC
  );
const BubblesExample: React.FC = () =>
  React.createElement(require('./BubblesExample').default as React.FC);
const Carousel: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/Carousel').default as React.FC
  );
const ChangeThemeExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/ChangeTheme').default as React.FC
  );
const ChangeThemeSharedExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/ChangeTheme').default
  );
const ChatHeadsExample: React.FC = () =>
  React.createElement(require('./ChatHeadsExample').default as React.FC);
const ChessExample: React.FC = () =>
  React.createElement(require('./ChessExample').default as React.FC);
const ChessboardExample: React.FC = () =>
  React.createElement(require('./ChessboardExample').default as React.FC);
const CircularSliderExample: React.FC = () =>
  React.createElement(require('./CircularSliderExample').default as React.FC);
const ColorInterpolationExample: React.FC = () =>
  React.createElement(
    require('./ColorInterpolationExample').default as React.FC
  );
const ContrastColorExample: React.FC = () =>
  React.createElement(require('./ContrastColorExample').default as React.FC);
const CombinedTest: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/Combined').default as React.FC
  );
const ComposedHandlerConditionalExample: React.FC = () =>
  React.createElement(
    require('./ComposedHandlerConditionalExample').default as React.FC
  );
const ComposedHandlerDifferentEventsExample: React.FC = () =>
  React.createElement(
    require('./ComposedHandlerDifferentEventsExample').default
  );
const ComposedHandlerInternalMergingExample: React.FC = () =>
  React.createElement(
    require('./ComposedHandlerInternalMergingExample').default
  );
const CustomLayoutAnimationScreen: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/CustomLayout').default as React.FC
  );
const DefaultAnimations: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/DefaultAnimations').default as React.FC
  );
const DeleteAncestorOfExiting: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/DeleteAncestorOfExiting').default
  );
const DetachAnimatedStylesExample: React.FC = () =>
  React.createElement(
    require('./DetachAnimatedStylesExample').default as React.FC
  );
const DispatchCommandExample: React.FC = () =>
  React.createElement(require('./DispatchCommandExample').default as React.FC);
const DurationZeroExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/DurationZero').default as React.FC
  );
const ExitingTagReuseStressExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/ExitingTagReuseStressExample')
      .default as React.FC
  );
const DynamicColorIOSExample: React.FC = () =>
  React.createElement(require('./DynamicColorIOSExample').default as React.FC);
const EmojiWaterfallExample: React.FC = () =>
  React.createElement(require('./EmojiWaterfallExample').default as React.FC);
const EmptyExample: React.FC = () =>
  React.createElement(require('./EmptyExample').default as React.FC);
const SettledPropsLeakExample: React.FC = () =>
  React.createElement(require('./SettledPropsLeakExample').default as React.FC);
const InlineStylesAndPropsExample: React.FC = () =>
  React.createElement(
    require('./InlineStylesAndPropsExample').default as React.FC
  );
const SuspenseLayoutAnimationCrashExample: React.FC = () =>
  React.createElement(
    require('./SuspenseLayoutAnimationCrashExample').default as React.FC
  );
const NestedExitingCleanupExample: React.FC = () =>
  React.createElement(
    require('./NestedExitingCleanupExample').default as React.FC
  );
const ExtrapolationExample: React.FC = () =>
  React.createElement(require('./ExtrapolationExample').default as React.FC);
const FilterExample: React.FC = () =>
  React.createElement(require('./FilterExample').default as React.FC);
const FinalFrameAccuracyExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/FinalFrameAccuracy').default as React.FC
  );
const FlatListExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/FlatList').default as React.FC
  );
const FlatListSkipEnteringExiting: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/FlatListSkipEnteringExiting').default
  );
const FlatListWithLayoutAnimations: React.FC = () =>
  React.createElement(
    require('./FlatListWithLayoutAnimationsExample').default as React.FC
  );
const FrameCallbackExample: React.FC = () =>
  React.createElement(require('./FrameCallbackExample').default as React.FC);
const FreezeExample: React.FC = () =>
  React.createElement(require('./FreezeExample').default as React.FC);
const GalleryExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/Gallery').default as React.FC
  );
const Game2048Example: React.FC = () =>
  React.createElement(require('./Game2048Example').default as React.FC);
const HabitsExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/HabitsExample').default as React.FC
  );
const InvalidValueAccessExample: React.FC = () =>
  React.createElement(
    require('./InvalidValueAccessExample').default as React.FC
  );
const InterruptedExitingExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/InterruptedExitingExample').default as React.FC
  );
const InvertedFlatListExample: React.FC = () =>
  React.createElement(require('./InvertedFlatListExample').default as React.FC);
const KeyframeAnimation: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/KeyframeAnimation').default as React.FC
  );
const LayoutAnimationBatchSyncExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/LayoutAnimationBatchSyncExample')
      .default as React.FC
  );
const LettersExample: React.FC = () =>
  React.createElement(require('./LettersExample').default as React.FC);
const LightBoxExample: React.FC = () =>
  React.createElement(require('./LightBoxExample').default as React.FC);
const LiquidSwipe: React.FC = () =>
  React.createElement(require('./LiquidSwipe/LiquidSwipe').default as React.FC);
const ListItemLayoutAnimation: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/ListItemLayoutAnimation').default
  );
const ManyScreensExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/ManyScreens').default
  );
const MatrixTransform: React.FC = () =>
  React.createElement(require('./MatrixTransform').default as React.FC);
const MemoExample: React.FC = () =>
  React.createElement(require('./MemoExample').default as React.FC);
const ModalExitingExample: React.FC = () =>
  React.createElement(require('./ModalExitingExample').default as React.FC);
const ModalsExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/Modals').default as React.FC
  );
const MoveWithExiting: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/MoveWithExiting').default as React.FC
  );
const NestedRotationExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/NestedRotation').default
  );
const SynchronousPropsSETExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/SynchronousPropsExample').default
  );
const NestedStacksExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/NestedStacks').default
  );
const OverlappingBoxesExample: React.FC = () =>
  React.createElement(require('./OverlappingBoxesExample').default as React.FC);
const PendulumExample: React.FC = () =>
  React.createElement(require('./PendulumExample').default as React.FC);
const PerformanceMonitorExample: React.FC = () =>
  React.createElement(
    require('./PerfomanceMonitorExample').default as React.FC
  );
const PinExample: React.FC = () =>
  React.createElement(require('./PinExample').default as React.FC);
const PlanetsExample: React.FC = () =>
  React.createElement(require('./PlanetsExample').default as React.FC);
const PlatformColorExample: React.FC = () =>
  React.createElement(require('./PlatformColorExample').default as React.FC);
const ProfilesExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/Profiles').default as React.FC
  );
const ProgressTransitionExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/ProgressTransition').default
  );
const ReducedMotionExample: React.FC = () =>
  React.createElement(require('./ReducedMotionExample').default as React.FC);
const ReducedMotionLayoutExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/ReducedMotionLayoutExample').default
  );
const RefExample: React.FC = () =>
  React.createElement(require('./RefExample').default as React.FC);
const ReparentingExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/ReparentingExample').default as React.FC
  );
const RestoreStateExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/RestoreState').default
  );
const ScreenlessBasic: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/ScreenlessBasic').default as React.FC
  );
const ScrollPerformanceExample: React.FC = () =>
  React.createElement(
    require('./ScrollPerformanceExample').default as React.FC
  );
const ScrollToExample: React.FC = () =>
  React.createElement(require('./ScrollToExample').default as React.FC);
const ScrollViewOffsetExample: React.FC = () =>
  React.createElement(require('./ScrollViewOffsetExample').default as React.FC);
const SetNativePropsExample: React.FC = () =>
  React.createElement(require('./SetNativePropsExample').default as React.FC);
const SharedStyleExample: React.FC = () =>
  React.createElement(require('./SharedStyleExample').default as React.FC);
const SlowAnimationsExample: React.FC = () =>
  React.createElement(require('./SlowAnimationsExample').default as React.FC);
const SpringPresetsAndClampExample: React.FC = () =>
  React.createElement(
    require('./SpringPresetsAndClampExample').default as React.FC
  );
const StickyHeaderExample: React.FC = () =>
  React.createElement(require('./StickyHeaderExample').default as React.FC);
const StrictDOMExample: React.FC = () =>
  React.createElement(require('./StrictDOMExample').default as React.FC);
const StrictModeComparison: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/StrictModeComparisonExample').default
  );
const SyncBackToReactExample: React.FC = () =>
  React.createElement(require('./SyncBackToReactExample').default as React.FC);
const SynchronousPropsExample: React.FC = () =>
  React.createElement(require('./SynchronousPropsExample').default as React.FC);
const TabNavigatorExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/TabNavigatorExample').default
  );
const ThirdPartyComponentsExample: React.FC = () =>
  React.createElement(
    require('./ThirdPartyComponentsExample').default as React.FC
  );
const TransformOriginExample: React.FC = () =>
  React.createElement(require('./TransformOriginExample').default as React.FC);
const TransitionRestartExample: React.FC = () =>
  React.createElement(
    require('./SharedElementTransitions/TransitionRestart').default
  );
const UpdatePropsPerfExample: React.FC = () =>
  React.createElement(require('./UpdatePropsPerfExample').default as React.FC);
const ViewFlatteningExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/ViewFlattening').default as React.FC
  );
const ViewRecyclingExample: React.FC = () =>
  React.createElement(
    require('./LayoutAnimations/ViewRecyclingExample').default
  );
const WidthExample: React.FC = () =>
  React.createElement(require('./WidthExample').default as React.FC);

// Sections of the "Show Cases and Regressions" group. Declared before
// `ALL_EXAMPLES` because its entries reference them.
const SHOW_CASES = 'Show Cases';
const SHOW_CASES_AND_REGRESSIONS = 'Show Cases and Regressions';
const REGRESSIONS = 'Regressions';

const ALL_EXAMPLES: Record<string, Example> = {
  // About
  AboutExample: {
    icon: 'ℹ️',
    title: 'About',
    screen: AboutExample,
  },

  SuspenseLayoutAnimationCrashExample: {
    icon: '💥',
    title: 'Suspense + Layout Animation Crash',
    section: REGRESSIONS,
    screen: SuspenseLayoutAnimationCrashExample,
    disabledPlatforms: [REAPlatform.WEB],
  },
  SettledPropsLeakExample: {
    icon: '🚿',
    title: 'Settled props leak',
    screen: SettledPropsLeakExample,
  },

  // Empty example for test purposes
  EmptyExample: {
    icon: '👻',
    title: 'Empty',
    screen: EmptyExample,
  },
  InlineStylesAndPropsExample: {
    icon: '🎛️',
    title: 'Inline styles and props',
    screen: InlineStylesAndPropsExample,
  },
  SlowAnimationsExample: {
    icon: '🐢',
    title: 'Slow animations',
    section: REGRESSIONS,
    screen: SlowAnimationsExample,
  },
  SyncBackToReactExample: {
    icon: '🔄',
    title: 'Sync back to React',
    screen: SyncBackToReactExample,
  },
  AndroidDrawPassExample: {
    icon: '✍️',
    title: 'Android Draw Pass',
    section: REGRESSIONS,
    screen: AndroidDrawPassExample,
  },
  DetachAnimatedStylesExample: {
    icon: '⛓️‍💥',
    title: 'Detach animated styles',
    screen: DetachAnimatedStylesExample,
  },
  ScrollPerformanceExample: {
    icon: '🚁',
    title: 'Scroll performance',
    screen: ScrollPerformanceExample,
  },
  ThirdPartyComponentsExample: {
    icon: '3️⃣',
    title: 'Third party components',
    section: SHOW_CASES,
    screen: ThirdPartyComponentsExample,
  },
  ReactFreeze: {
    icon: '❄️',
    title: 'React freeze',
    screen: FreezeExample,
  },
  CircularSliderExample: {
    icon: '🔘',
    title: 'Circular slider',
    section: SHOW_CASES,
    screen: CircularSliderExample,
  },
  MemoExample: {
    icon: '🧠',
    title: 'Memo',
    screen: MemoExample,
  },
  AnimatedPropsExample: {
    icon: '🎨',
    title: 'Animated props',
    screen: AnimatedPropsExample,
  },
  InvalidReadWriteExample: {
    icon: '🔒',
    title: 'Invalid read/write during render',
    screen: InvalidValueAccessExample,
  },
  BottomSheetExample: {
    icon: '⬆️',
    title: 'Bottom sheet',
    section: REGRESSIONS,
    screen: BottomSheetExample,
  },
  FlatListWithLayoutAnimations: {
    icon: '🎻',
    title: 'FlatList with layout animations',
    section: REGRESSIONS,
    screen: FlatListWithLayoutAnimations,
  },

  // Showcase

  BokehExample: {
    icon: '✨',
    title: 'Bokeh',
    section: SHOW_CASES,
    screen: BokehExample,
  },
  BubblesExample: {
    icon: '🫧',
    title: 'Bubbles',
    section: SHOW_CASES,
    screen: BubblesExample,
  },
  EmojiWaterfallExample: {
    icon: '💸',
    title: 'Emoji waterfall',
    section: REGRESSIONS,
    screen: EmojiWaterfallExample,
  },
  LightBoxExample: {
    icon: '📷',
    title: 'Camera roll',
    section: SHOW_CASES,
    screen: LightBoxExample,
  },
  LiquidSwipe: {
    icon: '♠️',
    title: 'Liquid swipe',
    section: SHOW_CASES_AND_REGRESSIONS,
    screen: LiquidSwipe,
    disabledPlatforms: [REAPlatform.WEB],
  },
  ArticleProgressExample: {
    icon: '📰',
    title: 'Article progress',
    section: SHOW_CASES,
    screen: ArticleProgressExample,
  },
  LettersExample: {
    icon: '📖',
    title: 'Letters',
    section: SHOW_CASES,
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
    section: REGRESSIONS,
    screen: UpdatePropsPerfExample,
  },

  // Basic examples
  AnimatableRefExample: {
    icon: '⏬',
    title: 'Animate inner component',
    screen: AnimatableRefExample,
  },
  AmountExample: {
    icon: '📈',
    title: 'Amount',
    section: SHOW_CASES,
    screen: AmountExample,
  },
  FilterExample: {
    icon: '🖼️',
    title: 'Animate filter',
    section: REGRESSIONS,
    screen: FilterExample,
  },
  SynchronousPropsExample: {
    icon: '⚡',
    title: 'Animate synchronous props',
    section: REGRESSIONS,
    screen: SynchronousPropsExample,
  },
  PlanetsExample: {
    icon: '🪐',
    title: 'Planets',
    section: SHOW_CASES,
    screen: PlanetsExample,
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
  ScrollToExample: {
    icon: '🦘',
    title: 'scrollTo',
    section: REGRESSIONS,
    screen: ScrollToExample,
  },
  ScrollViewOffsetExample: {
    icon: '𝌍',
    title: 'useScrollOffset',
    section: REGRESSIONS,
    screen: ScrollViewOffsetExample,
  },
  StickyHeaderExample: {
    icon: '🔝',
    title: 'Stinky header',
    section: REGRESSIONS,
    screen: StickyHeaderExample,
    disabledPlatforms: [REAPlatform.WEB],
  },
  DispatchCommandExample: {
    icon: '🫡',
    title: 'Dispatch command',
    screen: DispatchCommandExample,
  },
  WidthExample: {
    icon: '🌲',
    title: 'Layout props',
    section: REGRESSIONS,
    screen: WidthExample,
  },
  RefExample: {
    icon: '🦑',
    title: 'Ref & useImperativeHandle',
    screen: RefExample,
  },
  ChessExample: {
    icon: '♟️',
    title: 'Chess',
    section: SHOW_CASES,
    screen: ChessExample,
  },
  ChessboardExample: {
    icon: '♟️',
    title: 'Chessboard',
    section: REGRESSIONS,
    screen: ChessboardExample,
  },
  Game2048Example: {
    icon: '🕹️',
    title: '2048',
    section: REGRESSIONS,
    screen: Game2048Example,
  },
  OverlappingBoxesExample: {
    icon: '🔝',
    title: 'z-index & elevation',
    section: REGRESSIONS,
    screen: OverlappingBoxesExample,
  },
  MatrixExample: {
    icon: '🧮',
    title: 'useAnimatedStyle with matrix',
    screen: MatrixTransform,
    disabledPlatforms: [REAPlatform.WEB],
  },
  SpringExample: {
    icon: '🕰',
    title: 'Pendulum example',
    section: SHOW_CASES,
    screen: PendulumExample,
  },
  SpringPresetsAndClampExample: {
    icon: '🛠',
    title: 'Spring presets and clamp',
    section: SHOW_CASES,
    screen: SpringPresetsAndClampExample,
  },
  ReducedMotionExample: {
    icon: '⏸️',
    title: 'Reduced Motion',
    section: SHOW_CASES_AND_REGRESSIONS,
    screen: ReducedMotionExample,
  },
  HabitsExample: {
    icon: '🧑‍💻',
    title: 'Habits',
    section: SHOW_CASES,
    screen: HabitsExample,
  },
  PerformanceMonitorExample: {
    icon: '⏱️',
    title: 'Performance monitor',
    section: REGRESSIONS,
    screen: PerformanceMonitorExample,
  },
  ComposedHandlerConditionalExample: {
    icon: '🎛️',
    title: 'Composed handler conditional compose',
    screen: ComposedHandlerConditionalExample,
  },
  ComposedHandlerDifferentEventsExample: {
    icon: '📣',
    title: 'Composed handler different events',
    screen: ComposedHandlerDifferentEventsExample,
  },
  ComposedHandlerInternalMergingExample: {
    icon: '🪢',
    title: 'Composed handler internal merging',
    screen: ComposedHandlerInternalMergingExample,
  },
  BBExample: {
    icon: '💀',
    title: 'BB',
    section: REGRESSIONS,
    screen: BBExample,
  },
  StrictDOMExample: {
    icon: '👮‍♂️',
    title: 'React Strict DOM',
    screen: StrictDOMExample,
  },
  ProfilesExample: {
    icon: '🙆‍♂️',
    title: 'Profiles',
    section: SHOW_CASES,
    screen: ProfilesExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: true,
      android: true,
    },
  },
  ProgressTransitionExample: {
    icon: '☕',
    title: 'Progress transition',
    section: SHOW_CASES,
    screen: ProgressTransitionExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: true,
      android: true,
    },
  },
  GalleryExample: {
    icon: '🇮🇹',
    title: 'Gallery',
    section: SHOW_CASES,
    screen: GalleryExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: true,
      android: true,
    },
  },
  DynamicColorIOSExample: {
    title: 'DynamicColorIOS',
    section: SHOW_CASES,
    screen: DynamicColorIOSExample,
    icon: '🌗',
    disabledPlatforms: [REAPlatform.ANDROID, REAPlatform.WEB],
  },
  PlatformColorExample: {
    title: 'PlatformColor',
    section: SHOW_CASES,
    screen: PlatformColorExample,
    icon: '🎨',
    disabledPlatforms: [REAPlatform.WEB],
  },

  // Old examples
  SharedStyleExample: {
    title: 'Shared style',
    screen: SharedStyleExample,
  },
  ChatHeadsExample: {
    title: 'Chat heads',
    section: REGRESSIONS,
    screen: ChatHeadsExample,
  },
  ColorInterpolationExample: {
    title: 'Color interpolation',
    section: SHOW_CASES,
    screen: ColorInterpolationExample,
  },
  ContrastColorExample: {
    icon: '🔲',
    title: 'Contrast color',
    screen: ContrastColorExample,
  },
  ExtrapolationExample: {
    title: 'Extrapolation example',
    screen: ExtrapolationExample,
  },
  InvertedFlatListExample: {
    title: 'Inverted FlatList example',
    section: REGRESSIONS,
    screen: InvertedFlatListExample,
  },
  PinExample: {
    title: 'PIN example',
    section: SHOW_CASES,
    screen: PinExample,
  },
  TransformOriginExample: {
    title: 'Transform origin example',
    section: SHOW_CASES,
    screen: TransformOriginExample,
  },

  // Layout Animations
  DeleteAncestorOfExiting: {
    title: '[LA] Deleting view with an exiting animation',
    screen: DeleteAncestorOfExiting,
  },
  InterruptedExiting: {
    title: '[LA] Interrupted exiting animation (#7493)',
    screen: InterruptedExitingExample,
  },
  LayoutAnimationBatchSync: {
    title: '[LA] Batch synchronization',
    screen: LayoutAnimationBatchSyncExample,
  },
  CombinedLayoutAnimations: {
    title: '[LA] Entering and Exiting with Layout',
    screen: CombinedTest,
  },
  DefaultAnimations: {
    title: '[LA] Default layout animations',
    screen: DefaultAnimations,
  },
  KeyframeAnimation: {
    title: '[LA] Keyframe animation',
    screen: KeyframeAnimation,
  },
  CustomLayoutAnimation: {
    title: '[LA] Custom layout animation',
    screen: CustomLayoutAnimationScreen,
  },
  StrictModeComparison: {
    title: '[LA] Strict Mode Comparison',
    screen: StrictModeComparison,
  },
  ListItemLayoutAnimation: {
    title: '[LA] List item layout animation',
    screen: ListItemLayoutAnimation,
  },
  Carousel: {
    title: '[LA] Carousel',
    screen: Carousel,
  },
  ReducedMotionLayoutExample: {
    title: '[LA] Reduced Motion',
    screen: ReducedMotionLayoutExample,
  },
  FlatListSkipEnteringExiting: {
    title: '[LA] FlatList skip entering & exiting',
    screen: FlatListSkipEnteringExiting,
  },
  ChangeTheme: {
    title: '[LA] Change theme',
    screen: ChangeThemeExample,
  },
  BottomTabs: {
    title: '[LA] Bottom Tabs',
    screen: BottomTabsExample,
  },
  ViewFlattening: {
    title: '[LA] View Flattening',
    screen: ViewFlatteningExample,
  },
  ViewRecycling: {
    title: '[LA] View Recycling',
    screen: ViewRecyclingExample,
  },
  ReparentingExample: {
    title: '[LA] Reparenting',
    screen: ReparentingExample,
  },
  ModalExitingExample: {
    title: '[LA] Modal exiting example',
    screen: ModalExitingExample,
  },
  MoveWithExiting: {
    title: '[LA] Move with exiting',
    screen: MoveWithExiting,
  },
  DurationZeroExample: {
    title: '[LA] Duration zero',
    screen: DurationZeroExample,
  },
  ExitingTagReuseStressExample: {
    title: '[LA] Exiting tag reuse stress',
    screen: ExitingTagReuseStressExample,
  },
  NestedExitingCleanupExample: {
    icon: '🧹',
    title: '[LA] Nested exiting cleanup',
    screen: NestedExitingCleanupExample,
  },
  FinalFrameAccuracyExample: {
    screen: FinalFrameAccuracyExample,
    title: '[LA] Final frame accuracy',
  },

  // Shared Element Transitions

  ManyScreensExample: {
    title: '[SET] Many screens',
    screen: ManyScreensExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: true,
      android: true,
    },
  },
  SynchronousPropsSETExample: {
    title: '[LA] Synchronous props',
    screen: SynchronousPropsSETExample,
    shouldWork: {
      ios: true,
      android: true,
    },
  },
  NestedStacksExample: {
    title: '[SET] Nested stacks',
    screen: NestedStacksExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: true,
      android: true,
    },
  },
  ModalsExample: {
    title: '[SET] Modals',
    screen: ModalsExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: false, // broken header height
      android: true,
    },
  },
  FlatListExample: {
    title: '[SET] FlatList',
    screen: FlatListExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: true,
      android: true,
    },
  },
  RestoreStateExample: {
    title: '[SET] Restore State',
    screen: RestoreStateExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: true,
      android: true,
    },
  },
  TransitionRestartExample: {
    title: '[SET] Transition Restart',
    screen: TransitionRestartExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: false, // goes too far up for some reason?
      android: true,
    },
  },
  ChangeThemeSharedExample: {
    title: '[SET] Change theme',
    screen: ChangeThemeSharedExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: false, // s2 -> change theme -> go back (progress) will have wrong target
      android: true,
    },
  },
  NestedRotationSharedExample: {
    title: '[SET] Nested Transforms',
    screen: NestedRotationExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: false, // broken for modals
      android: false, // broken transform, I think due to skew
    },
  },
  BorderRadiiExample: {
    title: '[SET] Border Radii',
    screen: BorderRadiiExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: false, // broken on back gesture
      android: true,
    },
  },
  TabNavigatorExample: {
    title: '[SET] Tab Navigator',
    screen: TabNavigatorExample,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: true,
      android: true,
    },
  },
  ScreenlessBasic: {
    title: '[SET] Screenless Basic',
    screen: ScreenlessBasic,
    disabledPlatforms: [REAPlatform.WEB],
    shouldWork: {
      ios: true,
      android: true,
    },
  },
} as const;

/**
 * `[LA]` and `[SET]` in a title are what assign a screen to its group, matching
 * the prefix convention the titles already used while the list was flat.
 */
function withTitlePrefix(prefix: string): Record<string, Example> {
  return Object.fromEntries(
    Object.entries(ALL_EXAMPLES).filter(([, example]) =>
      example.title.startsWith(prefix)
    )
  );
}

function withoutTitlePrefixes(
  prefixes: Array<string>
): Record<string, Example> {
  return Object.fromEntries(
    Object.entries(ALL_EXAMPLES).filter(
      ([, example]) =>
        !prefixes.some((prefix) => example.title.startsWith(prefix))
    )
  );
}

const LAYOUT_ANIMATION_PREFIX = '[LA]';
const SHARED_ELEMENT_TRANSITION_PREFIX = '[SET]';

export const EXAMPLES: Record<string, ExampleEntry> = {
  LayoutAnimations: {
    examples: withTitlePrefix(LAYOUT_ANIMATION_PREFIX),
    icon: '📐',
    title: 'Layout Animations',
  },
  SharedElementTransitions: {
    examples: withTitlePrefix(SHARED_ELEMENT_TRANSITION_PREFIX),
    hiddenPlatforms: [REAPlatform.WEB],
    icon: '🔗',
    title: 'Shared Element Transitions',
  },
  ShowCasesAndRegressions: {
    examples: withoutTitlePrefixes([
      LAYOUT_ANIMATION_PREFIX,
      SHARED_ELEMENT_TRANSITION_PREFIX,
    ]),
    icon: '🎠',
    sections: [SHOW_CASES, SHOW_CASES_AND_REGRESSIONS, REGRESSIONS],
    title: 'Show Cases and Regressions',
  },
};
