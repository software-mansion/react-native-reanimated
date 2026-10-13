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
