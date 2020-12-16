import { NodeResolvePlugin } from '../plugins'
import deepmerge from 'deepmerge'
import { build, BuildOptions, Metadata, Plugin } from 'esbuild'
import { promises as fsp } from 'fs'
import fsx from 'fs-extra'
import os from 'os'
import path from 'path'
import slash from 'slash'
import { isRunningWithYarnPnp, JS_EXTENSIONS } from '../constants'

import { removeColonsFromMeta } from './support'
import fromEntries from 'fromentries'
import { stripColon, unique } from './support'
import { flatten } from '../utils'

type Args = {
    entryPoints: string[]
    esbuildOptions?: Partial<BuildOptions>
    // resolver?: (cwd: string, id: string) => string
    stopTraversing?: (resolvedPath: string) => boolean
}

export type TraversalResultType = {
    resolvedImportPath: string
    importer: string
}

export async function traverseWithEsbuild({
    entryPoints,
    esbuildOptions = { plugins: [] },
    stopTraversing,
}: Args): Promise<TraversalResultType[]> {
    const destLoc = path.resolve(
        await fsp.mkdtemp(path.join(os.tmpdir(), 'dest')),
    )

    entryPoints = entryPoints.map((x) => path.resolve(x))

    try {
        const metafile = path.join(destLoc, 'meta.json')

        const esbuildCwd = process.cwd()
        await build(
            deepmerge(
                {
                    // splitting: true, // needed to dedupe modules
                    // external: externalPackages,

                    minifyIdentifiers: false,
                    minifySyntax: false,
                    minifyWhitespace: false,
                    mainFields: ['module', 'browser', 'main'],
                    sourcemap: false,
                    define: {
                        'process.env.NODE_ENV': JSON.stringify('dev'),
                        global: 'window',
                        // ...generateEnvReplacements(env),
                    },
                    inject: [
                        // require.resolve(
                        //     '@esbuild-plugins/node-globals-polyfill/process.js',
                        // ),
                    ],
                    // tsconfig: ,
                    loader: {
                        '.js': 'jsx',
                    },
                    plugins: [
                        ExternalButInMetafile(),
                        // NodeModulesPolyfillPlugin({ fs: true, crypto: true }), // TODO enable if in browser?
                        NodeResolvePlugin({
                            external: function external(resolved) {
                                if (
                                    stopTraversing &&
                                    stopTraversing(resolved)
                                ) {
                                    return {
                                        namespace: externalNamespace,
                                        path: resolved,
                                    }
                                }
                                return false
                            },
                            onUnresolved: (x) => {
                                logger.log(`cannot resolve '${x}'`)     
                                return {
                                    external: true,
                                }
                            },
                            resolveOptions: {
                                preserveSymlinks: isRunningWithYarnPnp || false,
                                extensions: [...JS_EXTENSIONS],
                            },
                        }),
                    ].filter(Boolean),
                    bundle: true,
                    platform: 'node',
                    format: 'esm',
                    write: true,
                    entryPoints,
                    outdir: destLoc,
                    minify: false,
                    logLevel: 'info',
                    metafile,
                } as BuildOptions,
                esbuildOptions,
            ),
        )

        let meta: Metadata = JSON.parse(
            await (await fsp.readFile(metafile)).toString(),
        )
        meta = removeColonsFromMeta(meta)
        // console.log(await (await fsp.readFile(metafile)).toString())

        const res = flatten(
            entryPoints.map((entry) => {
                return metaToTraversalResult({ meta, entry, esbuildCwd })
            }),
        ).map((x) => {
            return {
                ...x,
                resolvedImportPath: x.resolvedImportPath,
                importer: x.importer,
            }
        })
        return res
    } finally {
        await fsx.remove(destLoc)
    }
}

const externalNamespace = 'external-but-keep-in-metafile'
function ExternalButInMetafile(): Plugin {
    return {
        name: externalNamespace,
        setup(build) {
            const externalModule = 'externalModuleXXX'
            build.onResolve({ filter: new RegExp(externalModule) }, (args) => {
                if (args.path !== externalModule) {
                    return
                }
                return {
                    external: true,
                }
            })
            build.onLoad(
                {
                    filter: /.*/,
                    namespace: 'external-but-keep-in-metafile',
                },
                (args) => {
                    const contents = `export * from '${externalModule}'`
                    return { contents, loader: 'js' }
                },
            )
        },
    }
}

export function metaToTraversalResult({
    meta,
    entry,
    esbuildCwd = process.cwd(),
}: {
    meta: Metadata
    esbuildCwd: string
    entry: string
}): TraversalResultType[] {
    if (!path.isAbsolute(esbuildCwd)) {
        throw new Error('esbuildCwd must be an absolute path')
    }
    if (!path.isAbsolute(entry)) {
        throw new Error('entry must be an absolute path')
    }
    const alreadyProcessed = new Set<string>()
    let toProcess = [slash(path.relative(esbuildCwd, entry))]
    let result: TraversalResultType[] = []
    const inputs = fromEntries(
        Object.keys(meta.inputs).map((k) => {
            return [k, meta.inputs[k]]
        }),
    )
    while (toProcess.length) {
        const newImports = flatten(
            toProcess.map((newEntry) => {
                if (alreadyProcessed.has(newEntry)) {
                    return []
                }
                alreadyProcessed.add(newEntry)
                // newEntry = path.posix.normalize(newEntry) // TODO does esbuild always use posix?
                const input = inputs[newEntry] || inputs[path.resolve(newEntry)]
                if (!input) {
                    throw new Error(
                        `entry ${newEntry} is not present in esbuild metafile inputs ${JSON.stringify(
                            Object.keys(inputs),
                            null,
                            2,
                        )}`,
                    )
                }
                const currentImports = input.imports.map((x) => x.path)
                // newImports.push(...currentImports)
                result.push(
                    ...currentImports.map(
                        (x): TraversalResultType => {
                            return {
                                importer: path.resolve(esbuildCwd, newEntry),
                                resolvedImportPath: path.resolve(esbuildCwd, x),
                            }
                        },
                    ),
                )
                return currentImports
            }),
        ).filter(Boolean)
        toProcess = newImports
    }
    return unique(result, (x) => x.resolvedImportPath)
    // find the right output getting the key of the right output.inputs == input
    // get the imports of the inputs.[entry].imports and attach them the importer
    // do the same with the imports just found
    // return the list of input files
}