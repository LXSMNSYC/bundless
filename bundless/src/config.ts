import { CONFIG_NAME, DEFAULT_PORT } from './constants'
import findUp from 'find-up'
import fs from 'fs'
import * as esbuild from 'esbuild'
import { Plugin, PluginsExecutor } from './plugins-executor'
import path from 'path'

export async function getEntries(
    pluginsExecutor: PluginsExecutor,
    config: Config,
) {
    const root = pluginsExecutor.ctx.root
    if (config.entries) {
        // for (let entry of config.entries) {
        //     if (config.platform === 'browser' && !entry.endsWith('.html')) {
        //         throw new Error(
        //             `When targeting browser config.entries can only contain html files: ${entry}`,
        //         )
        //     }
        // }
        return (
            await Promise.all(
                config.entries.map((x) =>
                    pluginsExecutor
                        .resolve({
                            path: x,
                            resolveDir: config.root,
                        })
                        .then((x) => x?.path || ''),
                ),
            )
        )
            .filter(Boolean)
            .map((x) => path.resolve(root, x))
    }

    // public folder logic is already in the html resolver plugin
    const index1 = await pluginsExecutor.resolve({
        path: 'index.html',
        resolveDir: config.root,
    })
    if (index1?.path) {
        return [path.resolve(root, index1.path)]
    }

    throw new Error(
        `Cannot find entries, neither config.entries, index.html or public/index.html files are present\n${JSON.stringify(
            config,
            null,
            4,
        )}`,
    )
}

export type Platform = 'node' | 'browser'

export interface Config {
    server?: ServerConfig
    prebundle?: PrebundlingConfig
    build?: BuildConfig
    printStats?: boolean
    platform?: Platform
    root?: string
    env?: Record<string, string>
    entries?: string[]
    plugins?: Plugin[]
    jsx?:
        | 'vue'
        | 'preact'
        | 'react'
        | {
              factory?: string
              fragment?: string
          }
}

export interface PrebundlingConfig {
    force?: boolean
    includeWorkspacePackages?: string[] | boolean
}

export interface ServerConfig {
    openBrowser?: boolean
    cors?: boolean
    port?: number | string
    hmr?: HmrConfig | boolean
}

export const defaultConfig: Config = {
    // entries: ['index.html'], // entry files
    server: {
        port: 3000,
        hmr: true,
        openBrowser: false, // opens browser on server start
    },
    prebundle: {
        includeWorkspacePackages: false, // linked packages to prebundle
        force: false, // forces prebundling dependencies on server start
    },
    build: {
        basePath: '/',
        jsTarget: 'es2018', // target es version
        minify: true, // run esbuild minification
        outDir: './out', // output directory
    },
    platform: 'browser', // target platform, browser or node
    jsx: 'react', // jsx preset
    plugins: [],
}

export function loadConfig(from: string, name = CONFIG_NAME): Config {
    const configPath = findUp.sync(name, { cwd: from })
    let config: Config = {}
    if (configPath) {
        config = require(configPath)
    }
    if (!config.root) {
        config = { ...config, root: process.cwd() }
    }
    return config
}

export interface HmrConfig {
    protocol?: string
    hostname?: string
    port?: number
    path?: string
    /**
     * If you are using hmr ws proxy, it maybe timeout with your proxy program.
     * You can set this option to let client send ping socket to keep connection alive.
     * The option use `millisecond` as unit.
     * @default 30000ms
     */
    timeout?: number
}

export interface BuildConfig {
    basePath?: string
    outDir?: string
    minify?: boolean
    jsTarget?: string
}
