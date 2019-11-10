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
  
  // TODO
  const { objc, js, registry, objcregistry } = inputs[0];
  
  const codegenedJsModule = jscontent
    .replace(/(\/\/ REGISTRY BEGIN)[\s\S]*?(\/\/ REGISTRY END)/, `// REGISTRY BEGIN
// REGISTRY-
// REGISTRY END`)
    .replace(/(\/\/ NODES BEGIN)[\s\S]*?(\/\/ NODES END)/, `// NODES BEGIN
// NODES-
// NODES END`)
    .replace("// REGISTRY-", registry)
    .replace("// NODES-", js)
  
  const codegenedObjcModule = ioscontent
    .replace(/(\/\/ CODEGEN REGISTER BEGIN)[\s\S]*?(\/\/ CODEGEN REGISTER END)/, `// CODEGEN REGISTER BEGIN
            // CODEGEN-REGISTER
            // CODEGEN REGISTER END`)
    .replace(/(\/\/ CODEGEN CLASSES BEGIN)[\s\S]*?(\/\/ CODEGEN CLASSES END)/, `// CODEGEN CLASSES BEGIN
// CODEGEN-CLASSES
// CODEGEN CLASSES END`)
    .replace("// CODEGEN-CLASSES", objc)
    .replace("// CODEGEN-REGISTER", objcregistry)
  
  
  
  fs.writeFile(IOS, codegenedObjcModule, function(){console.log('done objc')});
  fs.writeFile(JS_MODULE, codegenedJsModule, function(){console.log('done js')});
}

traverse()
