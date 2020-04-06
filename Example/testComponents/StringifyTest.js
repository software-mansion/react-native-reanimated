import { useSharedValue, useWorklet } from 'react-native-reanimated';
import { View, Text } from 'react-native';

const StringifyTest = () => {
  
  const obj = {
    b: 45,
    c: 12.5,
    d: {
      x: 55,
      y: 99,
    },
  }
  const arr = [3,5,8,99,16]
  const so = useSharedValue(obj);
  const sa = useSharedValue(arr);
  console.log(`HERE 1 [${ JSON.stringify(obj) }]`)
  console.log(`HERE 2 [${ JSON.stringify(so) }]`)
  console.log(`HERE 3 [${ JSON.stringify(arr) }]`)
  console.log(`HERE 4 [${ JSON.stringify(sa) }]`)

  ;(useWorklet(function(o, a) {
    'worklet'
    this.log('---------- HERE worklet delimiter')
    this.log(o)
    this.log('---------- HERE worklet delimiter')
    this.log(a)
    this.log('---------- HERE worklet delimiter')
    /*
    this.log(JSON.stringify(o))
    this.log('---------- HERE worklet delimiter')
    this.log(o['b'].value)
    this.log('---------- HERE worklet delimiter')
    this.log(a)
    this.log('---------- HERE worklet delimiter')
    this.log(JSON.stringify(a))
    this.log('---------- HERE worklet delimiter')*/
    return true
  }, [so, sa]))();

  return (
    <View>
        <Text>testing stringify...</Text>
    </View>
  )
}

export default StringifyTest;