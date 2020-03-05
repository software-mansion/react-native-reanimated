import React from 'react';
import { TouchableHighlight } from "react-native";
import { Text } from 'react-native';

const MichalAppJustSet = () => {

    return <Text>MichalAppJustSet works</Text>

    const x = useSharedValue(0)
    const y = useSharedValue(0)
    const z = useRef(0);
    const tab = [[100, 0], [0, 100], [-100, 0], [0, -100]];

    return (
        <View style={style.sth}>
            <PanGestureHandler
                onGestureEvent={[worklet]}
                onHandlerStateChange={[worklet]}
            >
                <Animated.View
                    style={{
                        width: 40,
                        height: 40,
                        transform: [{
                            translateX: x
                        },
                        {
                            translateY: y
                        }]
                    }}
                />
            </PanGestureHandler>
            <TouchableHighlight onPress={() => {
                const vec = tab[z.current++];
                x.set(x.get() + vec[0]);
                y.set(y.get() + vec[1]);
            }}>
                change position
            </TouchableHighlight>    
        </View>
    )
}

export default MichalAppJustSet