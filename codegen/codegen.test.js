import codegen from './codegen'
import simple from "./__examples__/simple";
describe('Generates objc', () => {
  Object.keys(simple).map(key => {
    it(`${key} match`, () => {
      expect(
        codegen(simple[key]).objc
      ).toMatchSnapshot();
    })
  })
  
})

describe('Generates js', () => {
  Object.keys(simple).map(key => {
    it(`${key} match`, () => {
      expect(
        codegen(simple[key])
      ).toMatchSnapshot();
    })
  })
  
})
