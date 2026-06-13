import { execSync } from 'child_process';
try {
  execSync('git checkout -- src/App.tsx');
  console.log('RESTORATION_SUCCESSFUL');
} catch (err) {
  console.error('Restoration failed:', err.message);
}
