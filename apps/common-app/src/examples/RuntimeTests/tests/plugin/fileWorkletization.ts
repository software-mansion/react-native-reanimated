'worklet';

const getOne = () => {
  return 1;
};

const getterContainer = {
  getTwo: () => {
    return 2;
  },
};

export const getThree = () => {
  return getOne() + getterContainer.getTwo();
};

export const implicitContextObject = {
  getFour() {
    return 4;
  },
  getFive() {
    return this.getFour() + 1;
  },
};

export class ImplicitWorkletClass {
  getSix() {
    return 6;
  }

  getSeven() {
    return this.getSix() + 1;
  }
}
