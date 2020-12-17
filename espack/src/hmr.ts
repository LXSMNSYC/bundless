import { HMRPayload } from './client/types'
import { Graph } from './graph'
import { osAgnosticPath } from './prebundle/support'
import { fileToImportPath, importPathToFile } from './utils'

export async function onFileChange({
    graph,
    root,
    filePath,
    sendHmrMessage,
}: {
    graph: Graph
    root: string
    filePath: string
    sendHmrMessage: (x: HMRPayload) => any
}) {
    const relativePath = osAgnosticPath(filePath, root)
    const importPath = fileToImportPath(root, filePath)

    const toVisit: string[] = [relativePath]
    const visited: string[] = []

    while (toVisit.length) {
        const relativePath = toVisit.shift()
        if (!relativePath) {
            return
        }
        visited.push(relativePath)
        const node = graph.nodes[relativePath]
        // can be a non js file, like index.html
        if (!node) {
            return sendHmrMessage({ type: 'reload' })
        }
        // trigger an update if the module is able to handle it
        if (node.isHmrEnabled) {
            sendHmrMessage({ type: 'update', path: importPath })
        }
        // reached a boundary, stop hmr propagation
        if (node.hasHmrAccept) {
            return
        }
        const importers = node.importers()
        // reached another boundary, reload
        if (!importers.size) {
            return sendHmrMessage({ type: 'reload' })
        }
        for (let importer of importers) {
            // mark module as dirty, importers will refetch this module to see updates
            const node = graph.ensureEntry(importer)
            node.dirtyImportersCount++ 
        }
        toVisit.push(...importers)
    }
}