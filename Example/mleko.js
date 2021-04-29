let a = 0;
function useAnimatedStyle(lambda) {
  a++;
}

function interpolate() {}

// function tmp() {
//   'worklet'
//   if(a > 4) {
//     a--;
//   }
//   pies();
//   return {
//     width: 100,
//     tmp: [
//       {tmp: 2}
//     ]
//   }
// }

const style = useAnimatedStyle(() => {
  'worklet'
  if(a > 4) {
    a--;
  }
  interpolate();
  return {
    width: 100,
    tmp: [
      {tmp: 2}
    ]
  }
});