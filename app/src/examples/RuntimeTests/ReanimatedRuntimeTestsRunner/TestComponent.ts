import { findNodeHandle } from 'react-native';
import { getViewProp } from 'react-native-reanimated';

export class TestComponent {
  private ref: React.MutableRefObject<any>;
  constructor(ref: React.MutableRefObject<any>) {
    this.ref = ref;
  }
  public getStyle(propName) {
    return this.ref.current.props.style[propName];
  }
  public async getAnimatedStyle(propName) {
    const tag = findNodeHandle(this.ref.current) ?? -1;
    return getViewProp(tag, propName);
  }
  public getTag() {
    return findNodeHandle(this.ref.current) ?? -1;
  }
}
