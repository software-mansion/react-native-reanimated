/* eslint-disable no-case-declarations */
const { Parser } = require('acorn');

const JS_CLASS = `
class ::__NODE_NAME__:: extends AnimatedNode {
  constructor(input) {
    super(
      {
        type: '::__NODE_NAME__::',
        input: input,
      },
      input
    );
  }
}
`.trim()

const JS_REGISTRY = `
const registry = {
::__ITEMS__::
}
`.trim()

const JS_REGISTRY_ITEM= `
['::__ID__::']: ::__CLASS__::,
`.trim()

const OBJ_REGISTRY_ITEM= `
@"::__CLASS__::": [REA::__CLASS__::Node class],
`.trim()


const OBJC_TEMPLATE = `
@interface REA::__NODE_NAME__::Node : REANode
@end

@implementation REA::__NODE_NAME__::Node {
  NSArray<NSNumber *> *_input;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _input = config[@"input"];
  }
  return self;
}

- (id)evaluate
{
  return ::__CODE__::;
}

@end


`.trim()

function jsUcfirst(string)
{
  return string.charAt(0).toUpperCase() + string.slice(1);
}


function traverseNode(astNode, args) {
  if (astNode.type === 'Identifier') {
    return ({
      id: args[astNode.name],
      type: 'Identifier',
    })
  }
  

  if (astNode.type === 'Literal') {
    return ({
      value: astNode.value,
      type: 'Literal',
    })
  }
  
  // -1 makes me really sad
  if (astNode.type === 'UnaryExpression' && astNode.operator === '-') {
    return ({
      value: 0 - astNode.argument.value,
      type: 'Literal',
    })
  }
  
  
  return ({
    name: astNode.callee.name,
    type: 'Generic',
    args: astNode.arguments.map(v => traverseNode(v, args))
  })
}

const OBJC_COND = `
  (::__IF__::) ?
    ::__THEN__::
    : @(0)
`.trim();

const OBJC_COND_ELSE = `
  (::__IF__::) ?
    ::__THEN__::
    : ::__ELSE__::
`.trim()

const OBJC_LESS_THEN = `
  ::__A__:: < ::__B__::
`.trim()

const OBJC_MULTIPLY = `
  @(::__A__:: * ::__B__::)
`.trim()

const OBJC_NUMBER_LITERAL = `
  ::__A__::
`.trim()

const OBJC_IDENTIFIER = `
  [[self.nodesManager findNodeByID:_input[::__ID__::]] value]
`.trim()

const OBJC_NUM_IDENTIFIER = `
  [${OBJC_IDENTIFIER} doubleValue]
`.trim()




function codegenNode(node, enforceNumerical = false) {
  if (node.type === 'Literal') {
    // todo: handle string or undef
    return OBJC_NUMBER_LITERAL.replace('::__A__::', node.value)
  }
  
  if (node.type === 'Identifier') {
    if (enforceNumerical) {
      return OBJC_NUM_IDENTIFIER.replace('::__ID__::', node.id)
    }
    return OBJC_IDENTIFIER.replace('::__ID__::', node.id)
  }
  switch (node.name) {
    case 'cond':
      const template = node.args[2] ? OBJC_COND_ELSE : OBJC_COND;
      return template
        .replace('::__IF__::', codegenNode(node.args[0]))
        .replace('::__THEN__::', codegenNode(node.args[1]))
        .replace('::__ELSE__::', codegenNode(node.args[2]));
    case 'lessThan':
      return OBJC_LESS_THEN
        .replace('::__A__::', codegenNode(node.args[0], true))
        .replace('::__B__::', codegenNode(node.args[1], true))
  
    case 'multiply':
      return OBJC_MULTIPLY
        .replace('::__A__::', codegenNode(node.args[0], true))
        .replace('::__B__::', codegenNode(node.args[1], true))
  }
  return null;
}


module.exports = function codegen(input) {
  const ast =  Parser.parse(input, { sourceType: "module" })
  const red =
    ast.body
      .filter(v => v.type === "VariableDeclaration")
      .map(v => v.declarations[0])
      .filter(v => v.init.type === 'CallExpression')
      .filter(v => v.init.callee.callee.name === 'codegen')
      .filter(v => v.init.callee.arguments[0].type === 'Literal')
      .map(v => {
        const args = v.init.arguments[0].params.map(v => v.name).reduce((curr, w, i) => ({ ...curr, [w]: i }), {})
        return ({
          ret: traverseNode(v.init.arguments[0].body.body.find(w => w.type === "ReturnStatement").argument, args),
          name: 'CODEGEN' + jsUcfirst(v.init.callee.arguments[0].value),
          id: v.init.callee.arguments[0].value
        })
      })
  const objc = red
    .map(
      v => OBJC_TEMPLATE
        .replace(/::__NODE_NAME__::/g, v.name)
        .replace(/::__CODE__::/g, codegenNode(v.ret))
    )
    .join('\n')
  
  const js = red
    .map(
      v => JS_CLASS
        .replace(/::__NODE_NAME__::/g, v.name)
    )
    .join('\n')
  
  const registry = JS_REGISTRY.replace('::__ITEMS__::',
    red
      .map(
        v => JS_REGISTRY_ITEM
          .replace(/::__ID__::/g, v.id)
          .replace(/::__CLASS__::/g, v.name)
      )
      .join('\n')
  )
  
  
  const objcregistry = red
    .map(
      v => OBJ_REGISTRY_ITEM
        .replace(/::__CLASS__::/g, v.name)
    )
    .join('\n')
  
  
  return { objc, js, registry, objcregistry }
}

