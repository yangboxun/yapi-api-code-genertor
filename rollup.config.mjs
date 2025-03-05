import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.cjs.js', format: 'cjs', sourcemap: false, inlineDynamicImports: true },
      { file: 'dist/index.mjs.js', format: 'esm', sourcemap: false, inlineDynamicImports: true },
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true,
      }),
    ],
    external: ['axios', 'prettier', 'fs', 'json-schema-to-typescript', 'ejs'],
  },
  
  {
    input: 'src/cli.ts',
    output: {
      file: 'dist/cli.js',
      format: 'cjs',
      sourcemap: false,
      inlineDynamicImports: true, // 强制内联动态导入
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true,
      }),
    ],
    external: ['axios', 'inquirer', 'commander', 'chalk', 'json-schema-to-typescript', 'ejs'],
  },
]