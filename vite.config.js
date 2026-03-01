import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  gitSha = 'unknown';
}

export default defineConfig({
  base: '/Super-Metroid-Game1/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_SHA__: JSON.stringify(gitSha)
  }
});
