"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        environment: 'node',
        globals: true,
        clearMocks: true,
        env: {
            JWT_SECRET: 'test-jwt-secret-key-1234',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
});
