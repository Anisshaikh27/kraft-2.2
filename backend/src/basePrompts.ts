export const DESIGN_PROMPT =
  "For all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.\n\n" +
  "By default, this template supports JSX syntax with Tailwind CSS classes, React hooks, and Lucide React for icons. Do not install other packages for UI themes, icons, etc unless absolutely necessary or I request them.\n\n" +
  "Use icons from lucide-react for logos.\n\n" +
  "CRITICAL FOR IMAGES: Use high-quality stock photos from Unsplash. " +
  "NEVER use URLs with 'ixid', 'ixlib', or timestamps as they frequently result in 404 errors. " +
  "ONLY use the simple, reliable ID format: https://images.unsplash.com/photo-<ID>?auto=format&fit=crop&q=80&w=1080. \n\n" +
  "Verified Safe IDs for common themes:\n" +
  "- Tech/Software: 1498050108023-c5249f4df085\n" +
  "- Business/Dashboard: 1460925895917-afdab827c52f\n" +
  "- Modern Office: 1497366216548-37526070297c\n" +
  "- Abstract Art: 1557683316-973673baf926\n" +
  "- Food/Organic: 1567306301498-519add9a48be\n" +
  "- Nature: 1470782305335-ed31e67e355d\n\n" +
  "Always link directly to these images in image tags; do not attempt to download them.";

export const NODE_BASE_PROMPT =
  '<boltArtifact id="project-import" title="Project Files"><boltAction type="file" filePath="index.js">// run `node index.js` in the terminal\n\nconsole.log(`Hello Node.js v${process.versions.node}!`);\n</boltAction><boltAction type="file" filePath="package.json">{\n  "name": "node-starter",\n  "private": true,\n  "scripts": {\n    "test": "echo \\"Error: no test specified\\" && exit 1"\n  }\n}\n</boltAction></boltArtifact>';

export const REACT_BASE_PROMPT = `<boltAction type="file" filePath="index.html"><!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
</boltAction><boltAction type="file" filePath="package.json">{
  "name": "vite-react-typescript-starter",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2"
  }
}
</boltAction><boltAction type="file" filePath="postcss.config.js">export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
</boltAction><boltAction type="file" filePath="tailwind.config.js">/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
</boltAction><boltAction type="file" filePath="tsconfig.app.json">{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
</boltAction><boltAction type="file" filePath="tsconfig.json">{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
</boltAction><boltAction type="file" filePath="tsconfig.node.json">{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": false
  },
  "include": ["vite.config.ts"]
}
</boltAction><boltAction type="file" filePath="vite.config.ts">import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
  },
});
</boltAction><boltAction type="file" filePath="src/App.tsx">import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p>Start prompting (or editing) to see magic happen :)</p>
    </div>
  );
}

export default App;
</boltAction><boltAction type="file" filePath="src/index.css">@tailwind base;
@tailwind components;
@tailwind utilities;
</boltAction><boltAction type="file" filePath="src/main.tsx">import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
</boltAction><boltAction type="file" filePath="src/vite-env.d.ts">/// <reference types="vite/client" />
</boltAction></boltArtifact>`;

export const FORMAT_INSTRUCTION = `
<output_format>
ABSOLUTE OUTPUT FORMAT RULES — VIOLATION WILL CAUSE SYSTEM FAILURE:

You MUST wrap ALL code responses in this EXACT XML structure. The parser depends on this exact format.

REQUIRED STRUCTURE:
<boltArtifact id="kebab-case-id" title="Project Title">
<boltAction type="file" filePath="package.json">
{
  "name": "project-name",
  "dependencies": { ... },
  "devDependencies": { ... },
  "scripts": { "dev": "vite" }
}
</boltAction>
<boltAction type="file" filePath="src/App.tsx">
// complete file content — NO markdown, NO backticks
</boltAction>
<boltAction type="shell">
npm install
</boltAction>
</boltArtifact>

MANDATORY RULES (MEMORIZE THESE):

RULE 1 — EXACT TAG NAMES:
  - Root wrapper: <boltArtifact> (with id and title attributes)
  - Each file/command: <boltAction> (with type attribute)
  - Closing tags: </boltAction> and </boltArtifact>
  - NEVER use any other tag names

RULE 2 — ALLOWED type VALUES:
  - type="file" — for creating/updating files (MUST have filePath attribute)
  - type="shell" — for running shell commands (NO filePath attribute)
  - NEVER use type="tool_code", type="createFile", type="updateFile"

RULE 3 — package.json IS MANDATORY AND MUST BE MINIMAL:
  - ALWAYS include a <boltAction type="file" filePath="package.json"> as the FIRST file
  - The package.json MUST list ALL dependencies used in your code
  - STRICT BANNED packages — NEVER include these (they bloat the install and slow the preview):
      eslint, @eslint/*, eslint-plugin-*, typescript-eslint, prettier,
      jest, vitest, @testing-library/*, cypress, playwright,
      @types/jest, @types/mocha, husky, lint-staged, commitlint,
      @storybook/*, storybook, webpack, webpack-cli, webpack-dev-server,
      babel-loader, ts-loader, css-loader, style-loader,
      nodemon (use vite dev server instead)
  - ONLY include packages you actually import in the code
  - Keep devDependencies minimal: only vite, @vitejs/plugin-react, typescript, @types/react, @types/react-dom, tailwindcss, postcss, autoprefixer

RULE 4 — NO MARKDOWN INSIDE TAGS:
  - NEVER use \`\`\` (backtick fences) inside <boltAction> tags
  - NEVER wrap file contents in markdown code blocks
  - The content inside <boltAction> IS the raw file content, nothing else

RULE 5 — COMPLETE FILE CONTENTS:
  - NEVER truncate files with "..." or "// rest of code"
  - NEVER use "/* existing code */" or "<- leave original ->"
  - Every <boltAction type="file"> MUST contain the COMPLETE file

RULE 6 — App.tsx IS MANDATORY:
  - For React projects, ALWAYS include src/App.tsx
  - It is the application entry point — without it, nothing renders

RULE 7 — FILE PATHS:
  - Use filePath attribute ONLY (NEVER artifactPath)
  - All paths are relative to project root (e.g., "src/App.tsx", "package.json")

RULE 8 — TYPESCRIPT CONFIG:
  - Always set "strict": false in tsconfig to avoid type errors blocking the build
  - Always set "noUnusedLocals": false and "noUnusedParameters": false

WHAT WILL BREAK THE PARSER (NEVER DO THESE):
❌ Using \`\`\`tsx before file content inside boltAction tags
❌ Using <boltArtifact artifactPath="..."> instead of id/title
❌ Using type="tool_code" instead of type="file"
❌ Forgetting to close </boltAction> or </boltArtifact> tags
❌ Omitting package.json from the response
❌ Writing file content outside of <boltAction> tags
❌ Including eslint, jest, vitest, prettier, or any testing/linting package
❌ Using HTML entities like &lt; &gt; inside boltAction file content
</output_format>
`;