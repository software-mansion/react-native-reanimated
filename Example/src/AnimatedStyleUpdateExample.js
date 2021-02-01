// import Animated, {
//   useSharedValue,
//   useAnimatedReaction,
//   withTiming,
//   withDecay,
//   withRepeat,
//   withSequence,
//   withSpring,
//   withDelay,
//   useAnimatedRef,
//   useAnimatedGestureHandler,
//   measure,
//   useAnimatedStyle,
// } from 'react-native-reanimated';
// import {
//   PanGestureHandler,
//   TouchableWithoutFeedback,
// } from 'react-native-gesture-handler';
// import { View, Button, Text, StyleSheet } from 'react-native';
// import React, { useLayoutEffect, useEffect, useState } from 'react';

// function ProgressBarControl() {
//   const progress = useSharedValue(0);
//   const boxRef = useAnimatedRef();

//   const makeProgress = () => {
//     progress.value = withTiming(Math.min(progress.value + 0.2, 1));
//   };
//   const reset = () => {
//     progress.value = withTiming(0);
//   };

//   const barStyle = useAnimatedStyle(() => {
//     return {
//       width: `${progress.value * 100}%`,
//     };
//   });

//   const gestureHandler = useAnimatedGestureHandler({
//     onStart: (_, ctx) => {
//       ctx.startingProgress = progress.value;
//     },
//     onActive: (e, ctx) => {
//       const { width } = measure(boxRef);
//       const progressTranslation = e.translationX / width;
//       progress.value = ctx.startingProgress + progressTranslation;
//     },
//     onEnd: (e) => {
//       const { width } = measure(boxRef);
//       progress.value = withDecay({
//         velocity: e.velocityX / width,
//         clamp: [0, 1],
//       });
//     },
//   });

//   return (
//     <>
//       <View ref={boxRef} style={styles.barContainer}>
//         <PanGestureHandler onGestureEvent={gestureHandler}>
//           <Animated.View style={[styles.bar, barStyle]} />
//         </PanGestureHandler>
//       </View>
//       <Button onPress={makeProgress} title="make progress" />
//       <Button onPress={reset} title="start over" />
//     </>
//   );
// }

// export default function Main(props) {
//   return (
//     <View style={styles.container}>
//       <ProgressBarControl />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     marginTop: 150,
//     marginHorizontal: 20,
//     height: 120,
//     justifyContent: 'space-between',
//   },
//   barContainer: {
//     height: 50,
//     borderColor: '#001A72',
//     borderWidth: 1,
//     borderRadius: 5,
//     overflow: 'hidden',
//   },
//   bar: {
//     backgroundColor: '#001A72',
//     height: 50,
//   },
// });
