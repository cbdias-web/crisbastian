import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({ plugins: [react()], resolve: { alias: { '@': path.resolve('/app/src') } }, test: { environment: 'jsdom', globals: true, root: '/app', include: ['.tmp_tests/**/*.test.jsx'], testTimeout: 60000, setupFiles: ['/app/.tmp_tests/setup.js'] } });
