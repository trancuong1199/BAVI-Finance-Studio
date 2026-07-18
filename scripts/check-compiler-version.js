import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  const solc = require('solc');
  console.log("Installed solc version:", solc.version());
} catch (e) {
  console.error("Error loading solc:", e.message);
}
