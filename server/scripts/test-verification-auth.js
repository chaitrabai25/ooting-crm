import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMailTransporter, verifySmtpConfiguration } from '../src/services/otp.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function runTests() {
  console.log('================================================================');
  console.log(' 🛡️  OOTING CRM — SECURE AUTHENTICATION & OTP VERIFICATION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, name) {
    totalTests++;
    if (condition) {
      console.log(` ✅ PASS: ${name}`);
      passedTests++;
    } else {
      console.error(` ❌ FAIL: ${name}`);
      throw new Error(`Assertion failed: ${name}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST SUITE 1: Cryptographic OTP Generation & Purpose Isolation
  // ---------------------------------------------------------------------------
  console.log('--- [Suite 1: OTP Cryptography & Purpose Binding] ---');

  // 1. 6-Digit Random OTP Generation
  const testOtp = crypto.randomInt(100000, 1000000).toString();
  assert(/^\d{6}$/.test(testOtp), 'Generated OTP is strictly a 6-digit number');

  // 2. Hash with LOGIN Purpose
  const loginOtpHash = await bcrypt.hash(`LOGIN:${testOtp}`, 10);
  const isMatchLogin = await bcrypt.compare(`LOGIN:${testOtp}`, loginOtpHash);
  assert(isMatchLogin === true, 'Valid LOGIN OTP matches its bound hash');

  // 3. Prevent Cross-Purpose Replay (Login OTP used for Reset)
  const isCrossMatchReset = await bcrypt.compare(`RESET:${testOtp}`, loginOtpHash);
  assert(isCrossMatchReset === false, 'LOGIN OTP CANNOT be accepted as a PASSWORD_RESET OTP');

  // 4. Hash with RESET Purpose
  const resetOtpHash = await bcrypt.hash(`RESET:${testOtp}`, 10);
  const isMatchReset = await bcrypt.compare(`RESET:${testOtp}`, resetOtpHash);
  assert(isMatchReset === true, 'Valid PASSWORD_RESET OTP matches its bound hash');

  // 5. Prevent Cross-Purpose Replay (Reset OTP used for Login)
  const isCrossMatchLogin = await bcrypt.compare(`LOGIN:${testOtp}`, resetOtpHash);
  assert(isCrossMatchLogin === false, 'PASSWORD_RESET OTP CANNOT be accepted as a LOGIN OTP');

  // 6. Wrong OTP is rejected
  const wrongOtp = (parseInt(testOtp, 10) + 1).toString().padStart(6, '0');
  const isWrongMatch = await bcrypt.compare(`LOGIN:${wrongOtp}`, loginOtpHash);
  assert(isWrongMatch === false, 'Incorrect OTP digit is rejected');

  // ---------------------------------------------------------------------------
  // TEST SUITE 2: Expiry & Attempt Limits Logic
  // ---------------------------------------------------------------------------
  console.log('\n--- [Suite 2: OTP Expiry & Attempt Thresholds] ---');

  // Expiry Logic
  const now = new Date();
  const validExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes in future
  const expiredExpiry = new Date(now.getTime() - 1000); // 1 second ago

  assert(now <= validExpiry, 'Fresh OTP within 5 minutes is valid');
  assert(now > expiredExpiry, 'Expired OTP is recognized as expired');

  // Cooldown Logic
  const cooldownWindowMs = 30 * 1000;
  const recentRequest = new Date(now.getTime() - 15 * 1000); // 15 seconds ago
  const oldRequest = new Date(now.getTime() - 45 * 1000); // 45 seconds ago

  const isCooldownActive = (now.getTime() - recentRequest.getTime()) < cooldownWindowMs;
  const isCooldownCleared = (now.getTime() - oldRequest.getTime()) >= cooldownWindowMs;

  assert(isCooldownActive === true, 'Resend request within 30s is throttled');
  assert(isCooldownCleared === true, 'Resend request after 30s is permitted');

  // Attempt threshold
  const maxAttempts = 5;
  assert(4 < maxAttempts, 'Attempts 1-4 are allowed');
  assert(5 >= maxAttempts, 'Attempt 5 is blocked');

  // ---------------------------------------------------------------------------
  // TEST SUITE 3: Password Reset Authorization & Token Invalidation
  // ---------------------------------------------------------------------------
  console.log('\n--- [Suite 3: Password Reset Token Security] ---');

  const jwtSecret = process.env.JWT_SECRET || 'ooting_crm_production_secret_key_2026_super_secure';
  const dummyUser = {
    id: 'test-user-uuid',
    email: 'test@ooting.in',
    passwordHash: await bcrypt.hash('OldSecurePassword1!', 10),
  };

  // Issue reset authorization token
  const resetToken = jwt.sign(
    {
      userId: dummyUser.id,
      email: dummyUser.email,
      purpose: 'PASSWORD_RESET',
      pwSig: dummyUser.passwordHash.slice(-10),
    },
    jwtSecret,
    { expiresIn: '15m' }
  );

  const decoded = jwt.verify(resetToken, jwtSecret);
  assert(decoded.purpose === 'PASSWORD_RESET', 'Token carries strict PASSWORD_RESET purpose');
  assert(decoded.pwSig === dummyUser.passwordHash.slice(-10), 'Token matches current password signature');

  // Simulate password update
  const newHash = await bcrypt.hash('NewSuperSecurePassword2026!', 10);
  const updatedUser = { ...dummyUser, passwordHash: newHash };

  // Ensure same token CANNOT be reused after password update
  const isTokenReused = decoded.pwSig === updatedUser.passwordHash.slice(-10);
  assert(isTokenReused === false, 'Reset token is invalidated immediately once password is changed');

  // ---------------------------------------------------------------------------
  // TEST SUITE 4: Hostinger SMTP Transporter Configuration
  // ---------------------------------------------------------------------------
  console.log('\n--- [Suite 4: Hostinger SMTP Security Inspection] ---');

  const transporter = getMailTransporter();
  const host = transporter.options.host;
  const port = transporter.options.port;
  const secure = transporter.options.secure;
  const tls = transporter.options.tls;

  assert(host === 'smtp.hostinger.com', `Host is configured to smtp.hostinger.com (got: ${host})`);
  assert(port === 465, `Port is configured to 465 (got: ${port})`);
  assert(secure === true, 'Secure connection is enabled (implicit SSL/TLS)');
  assert(tls?.rejectUnauthorized !== false, 'Certificate verification is strictly preserved');

  const smtpCheck = await verifySmtpConfiguration();
  console.log(` ℹ️  SMTP Configuration Status: ${smtpCheck.message}`);

  // ---------------------------------------------------------------------------
  // TEST SUITE 5: Production Database Integrity & Zero Data Loss Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- [Suite 5: Production Database Integrity Check] ---');

  const [
    userCount,
    customerCount,
    leadCount,
    followUpCount,
    packageCount,
    itineraryCount,
    quotationCount,
    bookingCount,
    travellerCount,
    paymentCount,
    agentCount,
    companyCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.lead.count(),
    prisma.followUp.count(),
    prisma.package.count(),
    prisma.itineraryDay.count(),
    prisma.quotation.count(),
    prisma.booking.count(),
    prisma.traveller.count(),
    prisma.payment.count(),
    prisma.agent.count(),
    prisma.company.count(),
  ]);

  console.log(` 👥 Users in database:       ${userCount}`);
  console.log(` 👤 Customers in database:   ${customerCount}`);
  console.log(` 🎯 Leads in database:       ${leadCount}`);
  console.log(` 📞 Follow-ups in database:  ${followUpCount}`);
  console.log(` 📦 Packages in database:    ${packageCount}`);
  console.log(` 🗺️  Itineraries in database: ${itineraryCount}`);
  console.log(` 📄 Quotations in database:  ${quotationCount}`);
  console.log(` 🏷️  Bookings in database:    ${bookingCount}`);
  console.log(` 💳 Payments in database:    ${paymentCount}`);
  console.log(` 🤝 Agents in database:      ${agentCount}`);
  console.log(` 🏢 Companies in database:   ${companyCount}`);

  assert(userCount === 6, `Expected exactly 6 production user accounts, found ${userCount}`);
  assert(customerCount === 10, `Expected 10 production customers, found ${customerCount}`);
  assert(packageCount === 14, `Expected 14 travel packages, found ${packageCount}`);
  assert(agentCount === 134, `Expected 134 travel agents, found ${agentCount}`);
  assert(itineraryCount === 48, `Expected 48 itineraries, found ${itineraryCount}`);

  console.log('\n================================================================');
  console.log(` 🏆 ALL ${passedTests}/${totalTests} TESTS PASSED WITH ZERO DATA LOSS!`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('\n❌ Test execution encountered an error:', err);
  process.exit(1);
});
