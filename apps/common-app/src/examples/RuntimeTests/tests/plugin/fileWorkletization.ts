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
