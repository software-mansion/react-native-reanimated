function Screen() {
    const x = useSharedValue(0)
    const y = useSharedValue(0)
    const prevX = useSharedValue(0)
    const prevY = useSharedValue(0)
    const totalX = useSharedValue(0)
    const totalY = useSharedValue(0)
    const velocityX = useSharedValue(0)
    const velocityY = useSharedValue(0)
    const ruszable = useWorklet(function(velocityX, velocityY, totalX, totalY){
        'worklet';
        const cords = [{velocity: velocityX, total: totalX}, {velocity: velocityY, total: totalY}];
        for (const cord of cords) {
            const {velocity, total} = cord;
            if (velocity.value > 0.01) {
                total.set(total.value + velocity.value / 60);
                velocity.set(velocity.value * 0.99);
            }
        }
        
        if (velocityX.value <= 0.01 && velocityY.value <= 0.01) {
            return true
        }
    }, [velocityX, velocityY, totalX, totalY]);
    const worklet = useEventWorklet(function(x, y, prevX, prevY, totalX, totalY, ruszable, velocityX, velocityY) {
        'worklet';
        x.set(this.event.translationX);
        y.set(this.event.translationY);
        if (this.event.state === 5) {
            prevX.set(x.value)
            prevY.set(y.value)
            x.set(0)
            y.set(0)
            velocityX.set(this.event.velocityX)
            velocityY.set(this.event.velocityY)
            this.start(ruszable)
        }
        totalX.set(x.value + prevX.value)
        totalY.set(y.value + prevY.value)
    }, [x, y, prevX, prevY, totalX, totalY, ruszable, velocityX, velocityY])
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
                            translateX: totalX
                        },
                        {
                            translateY: totalY
                        }]
                    }}
                />
            </PanGestureHandler>
        </View>
    )
} 