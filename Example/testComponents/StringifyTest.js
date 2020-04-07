import React from 'react'
import { useSharedValue, useWorklet } from 'react-native-reanimated';
import { View, Text } from 'react-native';

const StringifyTest = () => {
  
  const flatObject = {
    a: 45,
    b: 12.5,
  }
  const objInObj = {
    a: 12,
    b: {
      c: 38.1
    }
  }
  const flatArr = [3,5,8,99,16]
  const arrInObj = {
    a: 83.2,
    b: [4, 8, 112.2]
  }
  const objAndArrInObj = {
    a: 45.8,
    b: {
      d: 32.6
    },
    c: [4, 2, 1, 99.2]
  }

  const fo = useSharedValue(flatObject);
  const oio = useSharedValue(objInObj);
  const fa = useSharedValue(flatArr);
  const aio = useSharedValue(arrInObj);
  const oaio = useSharedValue(objAndArrInObj);

  console.log(`HERE 1 [${ JSON.stringify(flatObject) }]`)
  console.log(`HERE 2 [${ JSON.stringify(objInObj) }]`)
  console.log(`HERE 3 [${ JSON.stringify(flatArr) }]`)
  console.log(`HERE 4 [${ JSON.stringify(arrInObj) }]`)
  console.log(`HERE 4 [${ JSON.stringify(objAndArrInObj) }]`)

  ;(useWorklet(function(fo, oio, fa, aio, oaio) {
    'worklet'
    this.log('---------- HERE flat object')
    this.log(fo)
    this.log('---------- HERE object in object')
    this.log(oio)
    this.log('---------- HERE flat array')
    this.log(fa)
    this.log('---------- HERE array in object')
    this.log(aio)
    this.log('---------- HERE object and array in object')
    this.log(oaio)
    return true
  }, [fo, oio, fa, aio, oaio]))();

  return (
    <View>
        <Text>testing stringify...</Text>
    </View>
  )
}

export default StringifyTest;