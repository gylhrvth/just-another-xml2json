import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';


export default {
    input: 'src/index.ts',
    external: [], // add external dependencies here, e.g. ['lodash']
    plugins: [
        resolve(),
        commonjs(),
        typescript({
            tsconfig: './tsconfig.json',
            declaration: false,
            declarationMap: false
        })
    ],
    output: [
        {
            dir: 'dist/esm',
            format: 'esm',
            sourcemap: true,
            preserveModules: false,
            preserveModulesRoot: 'src',
            entryFileNames: '[name].js'
        },
        {
            dir: 'dist/cjs',
            format: 'cjs',
            sourcemap: true,
            preserveModules: false,
            preserveModulesRoot: 'src',
            entryFileNames: '[name].cjs',
            exports: 'named'
        }
    ]
};