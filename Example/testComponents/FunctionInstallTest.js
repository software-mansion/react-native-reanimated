import React from 'react';
import { Text, View } from "react-native"
import Animated, { useSharedValue, useWorklet, install, Worklet } from 'react-native-reanimated';

const WithWorkletTest = () => {
    const dummy = useSharedValue(0)
    const obj = {
        r: {
            curr: 30,
            max: 100,
        },
        g: {
            curr: 20,
            max: 200,
        },
        b: {
            curr: 10,
            max: 300,
        },
    }
    const so = useSharedValue(obj)
    const w = useWorklet(function(targetSV, max) {
        'worklet'
        console.log('[worklet with] ' + targetSV.value + '/' + max.value)
        if (targetSV.value > max.value) {
        targetSV.forceSet(max.value)
        return true
        }
        targetSV.forceSet(targetSV.value + 3)
    }, [dummy, dummy])
    // this does not work with new Worklet(...)
    /*
    const w = new Worklet(function(targetSV, max) {
        'worklet'
        console.log('[worklet with] ' + targetSV.value + '/' + max.value)
        if (targetSV.value > max.value) {
            targetSV.forceSet(max.value)
            return true
        }
        targetSV.forceSet(targetSV.value + 3)
    })
    */
    //
    ;(useWorklet(function(obj, w) {
        'worklet'
        console.log(`[worklet] start ${obj.r.curr.value}/${obj.g.curr.value}/${obj.b.curr.value}`)
        obj.r.curr.set(Reanimated.withWorkletCopy(w, [obj.r.max]))
        obj.g.curr.set(Reanimated.withWorkletCopy(w, [obj.g.max]))
        obj.b.curr.set(Reanimated.withWorkletCopy(w, [obj.b.max]))
        return true
    }, [so, w,]))();

    return (
        <View>
        <Text>TESTING</Text>
        <Animated.View style={ {
            backgroundColor: 'red',
            height: 10,
            width: so.r.curr,
        } } />
        <Animated.View style={ {
            backgroundColor: 'green',
            height: 10,
            width: so.g.curr,
        } } />
        <Animated.View style={ {
            backgroundColor: 'blue',
            height: 10,
            width: so.b.curr,
        } } />
        </View>
    )
}

const FunctionInstallTest = () => {
/* */
    const sv = useSharedValue(33)
    const sa = useSharedValue([1,2,3, { r: 88, f: 'uuu' }, ['a','b',6,7,8, sv]])
    const so = useSharedValue({ o: { a: { d: { u: ['a', 456]}}}, x: 6, d: 12, arr: sa, plainarr: [5,6,7,8], strarr:['a','b','sdfsdf']})

    ;(useWorklet(function() {
        'worklet'
        console.log('[worklet] testing event worklet constants')
        console.log(Reanimated.START)
        console.log(Reanimated.ACTIVE)
        console.log(Reanimated.END)
        return true
    }))();
/* */
    const obA = useSharedValue({
        a: 1,
        b: 2,
        d: 3,
    })
    const obB = useSharedValue({
        a: 11,
        b: 12,
        c: 13,
    })

    ;(useWorklet(function(input) {
        'worklet'
        console.log('[worklet] testing assign before')
        this.inspectPath('Reanimated')
        console.log(input.obA)
        console.log(input.obB)
        Reanimated.assign(input.obA, input.obB)
        console.log('[worklet] testing assign after')
        console.log(input.obA)
        console.log(input.obB)
        let result = 'success';
        const obAKeys = Object.keys(input.obA)
        if (JSON.stringify(obAKeys.sort()) === JSON.stringify(['id', 'a', 'b', 'd'].sort())) {
            for (let key of Object.keys(input.obB)) {
                if (key === 'id') continue
                if (obAKeys.includes(key)) {
                    if (input.obB[key].value !== input.obA[key].value) {
                        result = 'fail'
                        break
                    }
                }
            }
        }
        console.log('[worklet] testing assign result: ' + result)
        return true
    }, {obA, obB}))();

    ;(useWorklet(function() {
        'worklet'
        console.log('[worklet] testing memory')
        const memory = Reanimated.memory(this);
        memory.x = 99;
        console.log(`[worklet] memory check should be 99: ${ memory.x }`)
        return true
    }))();

    /*
    // tested in separate component
    ;(useWorklet(function() {
        'worklet'
        console.log('[worklet] testing withWorklet')
        // todo write test for withWorklet
        return true
    }))();
    */

    ;(useWorklet(function(sv, so, sa) {
        'worklet'
        console.log('[worklet] testing console.log')
        console.log(sv)
        console.log(sv.value)
        console.log(so)
        console.log(sa)
        return true
    }, [sv, so, sa]))();

    // test custom functions installation
    install('Reanimated.hello', function(name) {
        'worklet'
        console.log('inside hello')
        return `hello ${ name }`
    });

    install('Reanimated.validateAge', function(name, age) {
        'worklet'
        console.log('inside validate age')
        label = (age > 50) ? 'old' : 'young';
        return `${ Reanimated.hello(name) }, you are ${ label }`
    })

    ;(useWorklet(function() {
        'worklet'
        console.log('[worklet] testing custom functions')
        console.log(Reanimated.hello('john'))
        console.log(Reanimated.validateAge('samantha', 65))
        return true
    }))();

    // test constants installation
    install('Reanimated.minimum', -5.178);
    install('Reanimated.maximum', 12);
    install('Reanimated.label', '[const string works] -> ');

    const currentsv = useSharedValue(-100)
    ;(useWorklet(function(v) {
        'worklet'
        if (v.value < Reanimated.minimum) {
            v.set(Reanimated.minimum)
        }
        if (v.value > Reanimated.maximum) {
            console.log(Reanimated.label + 'over')
            return true
        }
        console.log(Reanimated.label + v.value)
        v.set(v.value + 1.037)
    }, [currentsv]))();
/* */
    // test weird paths
    install('a.b.z.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z', function(a, b) {
        'worklet'
        console.log(`long path working on ${a} ${b}`)
        return a+b*b
    });
    install('qwe.rty.uio.p.asd.fgh.jkl.zxc.vbn.mmm', 661)
    ;(useWorklet(function() {
        'worklet'
        
        console.log('[worklet] testing long paths, should execute function and be 21: ' + a.b.z.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z(5,4))
        console.log('[worklet] testing long paths, should be 661:' + qwe.rty.uio.p.asd.fgh.jkl.zxc.vbn.mmm)
        qwe.rty.uio.p.asd.fgh.jkl.zxc.vbn.mmm++;
        console.log('[worklet] testing long paths, should be 662:' + qwe.rty.uio.p.asd.fgh.jkl.zxc.vbn.mmm)
        return true;
    }))();
/* */
    //test install custom empty container
    install('my.custom.container')
    ;(useWorklet(function() {
        'worklet'
        my.custom.container.val = 345
        console.log('[worklet] testing custom container should be 345: ' + my.custom.container.val);
        my.custom.container.val += 5
        console.log('[worklet] testing custom container should be 350: ' + my.custom.container.val);
        return true;
    }))();
/* */
    // test object installation - not implemented yet
/* * /
    install('box', {
        x: 23,
        y: 54,
        name: 44,
    });

    const currentCoords = useSharedValue({ x: 0, y: 0 })
    ;(useWorklet(function(coords) {
        'worklet'
        if (coords.x.value > Reanimated.box.x && coords.y.value > Reanimated.box.y) {
            return true;
        }
        if (coords.x.value > Reanimated.box.x) {
            coords.x.set(coords.x.value + 1)
        }
        if (coords.y.value > Reanimated.box.y) {
            coords.y.set(coords.x.value + 1)
        }
        console.log(Reanimated.box.name + ': ' + coords.x.value + ', ' + coords.y.value)
    }, [currentCoords]))();
/* */
    // test array installation - not implemented yet
/* * /
    //const arr = useSharedValue([1, 2, 3, 5, 8, 13, 21])
    install('arr', [1, 2, 3, 4, 5, 6, 9])
    const currentIndex = useSharedValue(0)
    ;(useWorklet(function(index) {
        'worklet'
        console.log('array test')
        console.log(Reanimated.arr)
        console.log(Reanimated.arr[0])
        console.log(Reanimated.arr[0].value)
        console.log(Reanimated.arr[index.value].value)
    }, [currentIndex]))();
/* * /
    ;(useWorklet(function() {
        'worklet'
        this.log('[worklet] begin')
        const x = 9
        this.log('[worklet] int ' + x)
        const y = Reanimated.xs(x)
        this.log('[worklet] int installed function ' + y)
        this.log('[worklet] int installed const ' + Reanimated.cnst)
        this.log('[worklet] int installed weird ' + a.beee.ece.dyy.eeEeeEEE.ffff.granade.hulajnoga)
        return true
    }))();
/* */
    return (
        <View>
            <Text>Testing function install...</Text>
            <WithWorkletTest />
        </View>
    )
}

export default FunctionInstallTest