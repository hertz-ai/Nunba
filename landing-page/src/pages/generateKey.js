const crypto = require('crypto');

const generateSecretKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Usage: node generateKey.js
if (require.main === module) {
  process.stdout.write(generateSecretKey() + '\n');
}

module.exports = generateSecretKey;
