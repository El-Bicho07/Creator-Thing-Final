import fs from 'fs';
import path from 'path';

const packages = [
  'schemas',
  'config',
  'db',
  'ai',
  'skills',
  'scheduling',
  'ui'
];

for (const pkg of packages) {
  const dir = `packages/${pkg}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(`${dir}/src`, { recursive: true });

  fs.writeFileSync(`${dir}/package.json`, JSON.stringify({
    name: `@contentyou/${pkg}`,
    version: "0.0.0",
    private: true,
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      "build": "tsc",
      "typecheck": "tsc --noEmit",
      "lint": "eslint src/",
      "test": "vitest run"
    },
    dependencies: {},
    devDependencies: {
      "typescript": "5.7.3",
      "eslint": "9.20.1",
      "vitest": "3.0.5"
    },
    dependencyNotes: {
      "typescript": "Toolchain for typechecking",
      "eslint": "Toolchain for linting",
      "vitest": "Toolchain for testing"
    }
  }, null, 2));

  fs.writeFileSync(`${dir}/tsconfig.json`, JSON.stringify({
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "./dist",
      "rootDir": "./src"
    },
    "include": ["src/**/*"]
  }, null, 2));
}

// apps/agent
fs.mkdirSync('apps/agent/src', { recursive: true });
fs.writeFileSync('apps/agent/package.json', JSON.stringify({
  name: "agent",
  version: "0.0.0",
  private: true,
  scripts: {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "test": "vitest run"
  },
  dependencies: {
    "fastify": "5.2.1"
  },
  devDependencies: {
    "typescript": "5.7.3",
    "tsx": "4.19.2",
    "eslint": "9.20.1",
    "vitest": "3.0.5"
  },
  dependencyNotes: {
    "fastify": "Required web framework for agent process",
    "tsx": "Required for running dev server",
    "typescript": "Toolchain for typechecking",
    "eslint": "Toolchain for linting",
    "vitest": "Toolchain for testing"
  }
}, null, 2));

fs.writeFileSync('apps/agent/tsconfig.json', JSON.stringify({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}, null, 2));

// write stubs
fs.writeFileSync('packages/schemas/src/index.ts', `export * from './entities.js';\nexport * from './ports.js';\n`);
fs.writeFileSync('packages/schemas/src/entities.ts', `import { z } from 'zod';\nexport const Stub = z.string();\n`);
fs.writeFileSync('packages/schemas/src/ports.ts', `export type StubPort = {};\n`);

fs.writeFileSync('packages/config/src/index.ts', `export const config = {};\n`);
fs.writeFileSync('packages/db/src/index.ts', `export type DbStub = {};\nexport function connect() { throw new Error("not implemented: Stage 2"); }\n`);
fs.writeFileSync('packages/ai/src/index.ts', `import { LlmPort } from '@contentyou/schemas';\nexport type { LlmPort };\nexport function initAi() { throw new Error("not implemented: Stage 4"); }\n`);
fs.writeFileSync('packages/skills/src/index.ts', `export const registry = {};\nexport function initSkills() { throw new Error("not implemented: Stage 6"); }\n`);
fs.writeFileSync('packages/scheduling/src/index.ts', `export function initScheduling() { throw new Error("not implemented: Stage 7"); }\n`);
fs.writeFileSync('packages/ui/src/index.ts', `export function initUi() { throw new Error("not implemented: Stage 1"); }\n`);

fs.writeFileSync('apps/agent/src/index.ts', `
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
`);

console.log("Scaffolding complete.");
