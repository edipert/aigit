import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        pool: 'forks',
        // @ts-ignore
        poolOptions: {
            forks: {
                singleFork: true,
            }
        }
    },
});
