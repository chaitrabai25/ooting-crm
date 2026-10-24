import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger, LoggerService, sanitizeLogData } from '../src/services/logger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

async function runLoggerVerificationSuite() {
  console.log('🧪 ===================================================');
  console.log('🧪 Starting Ooting CRM Safe Logger Verification Suite');
  console.log('🧪 ===================================================\n');

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      testsFailed++;
    }
  }

  // TEST 1: Log directory auto-creation
  const logDir = logger.getLogDir();
  assert(fs.existsSync(logDir), `Logs directory exists at: ${logDir}`);

  // TEST 2: Sanitize sensitive data function
  const sensitivePayload = {
    username: 'admin@ooting.com',
    password: 'SuperSecretPassword@123',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    otp: '492817',
    authorization: 'Bearer secret_access_token_value',
    nested: {
      apiKey: 'api_live_99887766',
      creditCard: '4111222233334444',
      userEmail: 'user@example.com',
    },
  };

  const sanitized = sanitizeLogData(sensitivePayload);
  assert(sanitized.password === '[REDACTED]', 'Password field was redacted');
  assert(sanitized.passwordHash === '[REDACTED]', 'passwordHash field was redacted');
  assert(sanitized.token === '[REDACTED]', 'token field was redacted');
  assert(sanitized.otp === '[REDACTED]', 'otp field was redacted');
  assert(sanitized.authorization === '[REDACTED]', 'authorization field was redacted');
  assert(sanitized.nested.apiKey === '[REDACTED]', 'nested apiKey field was redacted');
  assert(sanitized.nested.creditCard === '[REDACTED]', 'nested creditCard field was redacted');
  assert(sanitized.username === 'admin@ooting.com', 'Non-sensitive username preserved');
  assert(sanitized.nested.userEmail === 'user@example.com', 'Non-sensitive email preserved');

  // TEST 3: Writing all log levels
  const uniqueId = `test_${Date.now()}`;
  logger.info('TestRunner', `Info event ${uniqueId}`, { user: 'test_user', role: 'ADMIN' });
  logger.warn('TestRunner', `Warning event ${uniqueId}`, { reason: 'high_memory_test' });
  logger.error('TestRunner', `Error event ${uniqueId}`, new Error('Simulated database timeout error'), { table: 'Booking' });
  logger.critical('TestRunner', `Critical event ${uniqueId}`, new Error('Simulated service outage'));

  const appLogPath = logger.getAppLogPath();
  const errorLogPath = logger.getErrorLogPath();

  assert(fs.existsSync(appLogPath), `app.log exists at: ${appLogPath}`);
  assert(fs.existsSync(errorLogPath), `error.log exists at: ${errorLogPath}`);

  const appLogContent = fs.readFileSync(appLogPath, 'utf-8');
  const errorLogContent = fs.readFileSync(errorLogPath, 'utf-8');

  assert(appLogContent.includes(`Info event ${uniqueId}`), 'app.log contains INFO log entry');
  assert(appLogContent.includes(`Warning event ${uniqueId}`), 'app.log contains WARNING log entry');
  assert(appLogContent.includes(`Error event ${uniqueId}`), 'app.log contains ERROR log entry');
  assert(appLogContent.includes(`Critical event ${uniqueId}`), 'app.log contains CRITICAL log entry');
  assert(appLogContent.includes('Simulated database timeout error'), 'app.log contains error stack / message');

  // TEST 4: Error log filtration (Only ERROR & CRITICAL)
  assert(errorLogContent.includes(`Error event ${uniqueId}`), 'error.log contains ERROR log entry');
  assert(errorLogContent.includes(`Critical event ${uniqueId}`), 'error.log contains CRITICAL log entry');
  assert(!errorLogContent.includes(`Info event ${uniqueId}`), 'error.log DOES NOT contain INFO log entry');
  assert(!errorLogContent.includes(`Warning event ${uniqueId}`), 'error.log DOES NOT contain WARNING log entry');

  // TEST 5: Verify no sensitive info in logs
  logger.info('TestRunner', `Sanitization verification for ${uniqueId}`, sensitivePayload);
  const updatedAppLog = fs.readFileSync(appLogPath, 'utf-8');
  assert(!updatedAppLog.includes('SuperSecretPassword@123'), 'Plaintext password NEVER written to app.log');
  assert(!updatedAppLog.includes('secret_access_token_value'), 'Plaintext token NEVER written to app.log');
  assert(!updatedAppLog.includes('api_live_99887766'), 'Plaintext API key NEVER written to app.log');
  assert(!updatedAppLog.includes('4111222233334444'), 'Plaintext credit card NEVER written to app.log');

  // TEST 6: File rotation verification using isolated test logger
  console.log('\n🔄 Testing automatic log rotation...');
  const testRotationDir = path.resolve(serverDir, 'logs/rotation_test');
  if (fs.existsSync(testRotationDir)) {
    fs.rmSync(testRotationDir, { recursive: true, force: true });
  }

  process.env.LOG_DIR = testRotationDir;
  process.env.LOG_MAX_SIZE_MB = '0.001'; // ~1 KB threshold for testing rotation
  process.env.LOG_MAX_FILES = '3';

  const testLogger = new LoggerService();
  const testAppLog = testLogger.getAppLogPath();

  // Write ~3KB of log data
  for (let i = 0; i < 30; i++) {
    testLogger.info('RotationTest', `Log line ${i} with filler text to exceed rotation threshold ${Date.now()}`);
  }

  const rotatedFile1 = path.join(testRotationDir, 'app.1.log');
  assert(fs.existsSync(testAppLog), 'Active app.log exists after rotation');
  assert(fs.existsSync(rotatedFile1), 'Rotated app.1.log was successfully created');

  // Cleanup test rotation folder
  fs.rmSync(testRotationDir, { recursive: true, force: true });
  delete process.env.LOG_DIR;
  delete process.env.LOG_MAX_SIZE_MB;
  delete process.env.LOG_MAX_FILES;

  console.log('\n===================================================');
  console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('===================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runLoggerVerificationSuite().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
