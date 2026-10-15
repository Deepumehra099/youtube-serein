import { config, validateConfig } from './config.js';
import { openDatabase } from './database.js';

const [action, rawEmail] = process.argv.slice(2);
if (action !== 'promote' || !rawEmail) {
  console.error('Usage: npm run admin:promote -- account@example.com');
  process.exitCode = 2;
} else {
  validateConfig();
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Enter the email address of an existing account.');
    process.exitCode = 2;
  } else {
    const db = openDatabase(config.databasePath);
    try {
      const result = db.prepare("UPDATE users SET role='admin' WHERE email=?").run(email);
      if (result.changes === 0) {
        console.error('No account with that email exists. Create the account first, then run this command.');
        process.exitCode = 1;
      } else {
        console.log('Admin access granted. Sign out and sign in again in Serein.');
      }
    } finally {
      db.close();
    }
  }
}
