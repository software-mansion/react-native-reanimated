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

interface IWorkletClass {
  getSix(): number;
  getSeven(): number;
}

export class ImplicitWorkletClass implements IWorkletClass {
  getSix(): number {
    return 6;
  }

  getSeven(): number {
    return this.getSix() + 1;
  }
}
