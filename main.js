const { execSync } = require('child_process');

try {
  console.log('Starting development server...');
  execSync('npx vite', { stdio: 'inherit' });
} catch (error) {
  console.error('An error occurred:', error.message);
  process.exit(1);
}