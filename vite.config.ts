import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
export default defineConfig({
	base: './',
	build: {
		outDir: './docs',
	},
	plugins: [vue(), svgLoader()],
	resolve: {
		alias: [
			{
				find: '@',
				replacement: path.resolve(__dirname, './src/'),
			},
		],
	},
})
