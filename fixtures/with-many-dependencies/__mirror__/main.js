import $viteCjsImport0_slash from "/web_modules/node_modules/slash/index.js?namespace=file";
const slash = $viteCjsImport0_slash;
import $viteCjsImport1_react from "/web_modules/node_modules/react/index.js?namespace=file";
const React = $viteCjsImport1_react;
import $viteCjsImport2_preact from "/web_modules/fixtures/with-many-dependencies/node_modules/preact/dist/preact.js?namespace=file";
const useState = $viteCjsImport2_preact["useState"];
import $viteCjsImport3_reactDom from "/web_modules/node_modules/react-dom/index.js?namespace=file";
const ReactDom = $viteCjsImport3_reactDom;

console.log('Hello world!')
console.log(slash)
console.log(React.useState)
console.log(useState)
console.log(ReactDom.render)

export const variable = 10