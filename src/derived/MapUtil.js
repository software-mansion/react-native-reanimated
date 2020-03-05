import AnimatedMap, { createAnimatedMap as map } from '../core/AnimatedMap';
import * as _ from 'lodash';
import AnimatedEvent from '../core/AnimatedEvent';


export default class MapUtil {
  static combine(a, b) {
    const mappingA = MapUtil.resolveMapping(a);
    const mappingB = MapUtil.resolveMapping(b);
    console.log(mappingA)
    return map(
      mappingA
    );
  }

  static squash(a, b) {
    const mappingA = MapUtil.resolveMapping(a);
    const mappingB = MapUtil.resolveMapping(b);

    return map(
      _.intersection(mappingA, mappingB),
      config
    );
  }

  static resolveMapping(arg) {
    if (arg instanceof AnimatedMap || arg instanceof AnimatedEvent) {
      const mapping = arg.__nodeConfig.argMapping;
      const input = arg._leafNodes;
      const out = {};
      mapping.forEach((unit, i) => {
        unit.pop();
        console.log(unit.join('.'))
        _.set(out, unit.join('.'), input[i]);
      });
      return out;
    } else {
      return arg;
    }
  }

}
