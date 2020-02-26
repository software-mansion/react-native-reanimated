"use strict"
const codeForExpresion = '(function(){const t = FUNCTION_CODE; t.asString = "FUNCTION_CODE"; return t;})()'
const codeForDeclaration = 'NAME.asString = "FUNCTION_CODE"'
module.exports = function ({ types: t }) {
  return {
    visitor: {
      DirectiveLiteral(path) {
        const value = path.node.value;
        if (value === 'worklet') {
          console.log("ok " + value);
          const fun = path.getFunctionParent();
          let str = fun.toString()
          str = str.replace(
            /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '');
          str = str.replace(/\n/ig, '');
          let newCode = ""
          let type = fun.node.type
          if (type === 'ArrowFunctionExpression') {
            str = ('function' + str).replace('=> {', '{')
            type = 'FunctionDeclaration'
          }
          
          if (type === 'FunctionExpression') {
            newCode = codeForExpresion.replace(/FUNCTION_CODE/g, str);
            fun.replaceWithSourceString(newCode);
            fun.skip();
          } else if (type === 'FunctionDeclaration') {
            newCode = codeForDeclaration;
            newCode = newCode.replace(/NAME/g, fun.node.id.name);
            newCode = newCode.replace(/FUNCTION_CODE/g, str);
            fun.insertAfter(t.StringLiteral(""));
            const nextInd = fun.key+1;
            fun.getSibling(nextInd).replaceWithSourceString(newCode);
          }
        }
      }
    },
  };
}