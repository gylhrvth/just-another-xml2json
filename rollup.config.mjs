import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';


export default {
    input: 'src/index.ts',
    external: [], // add external dependencies here, e.g. ['lodash']
    plugins: [
        resolve(),
        commonjs(),
        typescript({ tsconfig: './tsconfig.json' })
    ],
    output: [
        {
            file: 'dist/cjs/index.cjs',
            format: 'cjs',
            exports: 'named',
            sourcemap: true
        },
        {
            file: 'dist/esm/index.js',
            format: 'esm',
            sourcemap: true
        }
    ]
};