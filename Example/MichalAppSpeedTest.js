import { Dimentions } from 'react-native';
import { useEffect } from 'react';

function useSharedValue(initial) {
    const sv = React.useRef(null)
    React.useEffect(() => {
        sv.current = new AnimatedSharedValue(new SharedValue(initial))
        return () => sv.current.release()
    }, [])
    return sv.current
}

const workletBody = new Worklet(function(startTime, started, width) {
    'worklet';
    if (started.value === 0) {
        startTime.set(Date.now());
        started.set(1);
    }

    const duration = 5000;
    const delta = Date.now() - startTime.value;
    
    if (delta > duration) {
        return true;
    }
    width.set(delta * 200);
});

function Screen() {
    const worklets = [];
    const numberOfSquares = 100;

    const createAnimatedSquare = (widthSharedValue, height) => (<Animated.View
        style={{
            width: widthSharedValue,
            height: height,
            backgroundColor: "black",
        }}
    />);

    let arr = []

    for (let i = 0; i < numberOfSquares; ++i) {
        const startTime = useSharedValue(0);
        const started = useSharedValue(0);
        const width = useSharedValue(0);
        worklets.push(useWorklet(workletBody, startTime, started, width));

        arr.push(createAnimatedSquare(width, Dimentions.get('window').height) / numberOfSquares)
    }

    useEffect(()=>{
        for (let i = 0; i < numberOfSquares; ++i) {
            worklets[i]();
        }
    }, []);

    return (
        <View style={flex:1, flexDirection:'column'} >
            { arr.map(item => {item}<View style={{ height: 3, backgroundColor: 'black', width: 100 }}/>) }
        </View>
    )
} 