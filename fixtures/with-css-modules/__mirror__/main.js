import * as  __HMR__ from '/_hmr_client.js?namespace=hmr-client'; import.meta.hot = __HMR__.createHotContext(import.meta.url); import classNames from '/file.module.css?namespace=file'
import { text } from '/file.js?namespace=file'

console.log({ classNames })

const node = document.createElement('pre')
node.appendChild(document.createTextNode(text))
document.body.appendChild(node)

if (import.meta.hot) {
    import.meta.hot.accept()
}
