const codegen = require("./codegen");

const INPUT = [
  "./src/derived/abs.js"
]

const JS_MODULE = "./codegen/jsModule.js"
const IOS = "./ios/REANodesManager.m"


const fs = require('fs');



function readFileAsync(filename, enc) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, 'utf8', function(err, data){
      if (err)
        reject(err);
      else
        resolve(data);
    });
  });
};


async function traverse() {
  const ioscontent = await readFileAsync(IOS)
  const inputs = [];
  for (const i of INPUT) {
    inputs.push(codegen(await readFileAsync(i)))
  }
  const jscontent = await readFileAsync(JS_MODULE)
  
  console.log(jscontent)
  
  // TODO
  const { objc, js, registry, objcregistry } = inputs[0];
  
  js.replace("// REGISTRY", registry)
  
  const codegenedJsModule = jscontent
    .replace("// REGISTRY", registry)
    .replace("// NODES", js)
  
  const codegenedObjcModule = ioscontent
    .replace("// CODEGEN CLASSES", objc)
    .replace("// CODEGEN REGISTER", objcregistry)
  
  
  
  fs.writeFile(IOS, codegenedObjcModule, function(){console.log('done objc')});
  fs.writeFile(JS_MODULE, codegenedJsModule, function(){console.log('done js')});
}

traverse()
