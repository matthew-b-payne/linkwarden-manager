import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath } from 'url'
import AutoImport from 'unplugin-auto-import/vite'
import postBuildCommands from './scripts/postbuild'
import preBuildCommands from './scripts/prebuild'
import * as path from 'path'

// Define rollup input
const rollupInput = getRollupInput([
    './src/scripts/options/index.tsx',
    './src/scripts/options/options.html',
    './src/scripts/popup/index.tsx',
    './src/scripts/popup/popup.html',
    './src/scripts/onInstalled/index.tsx',
    './src/scripts/onInstalled/onInstalled.html',
    './src/scripts/service-worker/service-worker.ts',
])

function getRollupInput(files) {
    return files.reduce((acc, file) => {
        acc[path.basename(file, path.extname(file))] = fileURLToPath(new URL(file, import.meta.url))
        return acc
    }, {})
}

const outputOptions = {
    entryFileNames: info => 'js/[name].js',
    assetFileNames: info => 'assets/[ext]/[name].[ext]'
}

console.log(' ---> Starting Vite Build 🤞 <---')

// Vite config
export default defineConfig({
    // Extension pages are chrome-extension://…/src/scripts/popup/popup.html — absolute
    // `/assets/…` URLs resolve at the extension root in theory, but Chrome still treats
    // Vite's modulepreload links as a cross-world mismatch and drops them. Relative
    // paths (base './') + no modulepreload keep the popup/options bundles loading cleanly.
    base: './',
    resolve: {
        alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }]
    },
    server: {
        open: './src/index.html'
    },
    build: {
        modulePreload: false,
        rollupOptions: {
            input: rollupInput,
            output: outputOptions
        },
        chunkSizeWarningLimit:5500
    },
    plugins: [
        AutoImport({
            imports: ['react']
        }),
        react(),
        postbuildManifestPlugin(),
        viteStaticCopy({
            targets: [
                {
                    src: './src/assets/*',
                    dest: './assets',
                    rename: { stripBase: true }
                }
            ]
        })
    ]
})

function postbuildManifestPlugin() {
    return {
        name: 'postbuild-manifest',
        buildStart: async () => {
            preBuildCommands()
        },
        closeBundle: async () => {
            postBuildCommands()
        }
    }
}
