import { variable } from '/__..__/with-many-dependencies/main.js?namespace=file'

const node = document.createElement('pre')
document.body.appendChild(node.appendChild(document.createTextNode(variable)))
