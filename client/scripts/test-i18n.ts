/**
 * Multilingual & Token Preservation Verification Test Suite
 * Tests Dictionary integrity, token masking, price/ID preservation, and translation resolution.
 */

import { DICTIONARY, SUPPORTED_LANGUAGES, translateKey, Language } from '../src/i18n/translations.js';
import { TranslatorService } from '../src/services/translator.service.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ ${testName}`, details || '');
  }
}

console.log('\n========================================');
console.log('   OOTING CRM MULTILINGUAL TEST SUITE');
console.log('========================================\n');

// 1. Supported Languages
console.log('1. Supported Languages:');
assert(SUPPORTED_LANGUAGES.length === 3, 'Exactly 3 languages supported (en, kn, hi)');
assert(SUPPORTED_LANGUAGES.some(l => l.code === 'en'), 'English (en) exists');
assert(SUPPORTED_LANGUAGES.some(l => l.code === 'kn' && l.nativeName === 'ಕನ್ನಡ'), 'Kannada (kn, ಕನ್ನಡ) exists');
assert(SUPPORTED_LANGUAGES.some(l => l.code === 'hi' && l.nativeName === 'हिंदी'), 'Hindi (hi, हिंदी) exists');

// 2. Dictionary Completeness
console.log('\n2. Dictionary Completeness:');
const enKeys = Object.keys(DICTIONARY.en);
assert(enKeys.length >= 70, `English dictionary has extensive coverage (${enKeys.length} terms)`);

let missingKn = 0;
let missingHi = 0;

enKeys.forEach(key => {
  if (!DICTIONARY.kn[key] || DICTIONARY.kn[key].trim() === '') missingKn++;
  if (!DICTIONARY.hi[key] || DICTIONARY.hi[key].trim() === '') missingHi++;
});

assert(missingKn === 0, `All ${enKeys.length} keys have Kannada translations (missing: ${missingKn})`);
assert(missingHi === 0, `All ${enKeys.length} keys have Hindi translations (missing: ${missingHi})`);

// 3. Translation Resolution
console.log('\n3. Direct Translation Lookup:');
assert(translateKey('Dashboard', 'kn') === 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'Dashboard -> Kannada (ಡ್ಯಾಶ್‌ಬೋರ್ಡ್)');
assert(translateKey('Dashboard', 'hi') === 'डैशबोर्ड', 'Dashboard -> Hindi (डैशबोर्ड)');
assert(translateKey('Bookings', 'kn') === 'ಬುಕಿಂಗ್‌ಗಳು', 'Bookings -> Kannada (ಬುಕಿಂಗ್‌ಗಳು)');
assert(translateKey('Bookings', 'hi') === 'बुकिंग', 'Bookings -> Hindi (बुकिंग)');
assert(translateKey('Create New', 'kn') === 'ಹೊಸದನ್ನು ರಚಿಸಿ', 'Create New -> Kannada (ಹೊಸದನ್ನು ರಚಿಸಿ)');
assert(translateKey('Create New', 'hi') === 'नया बनाएं', 'Create New -> Hindi (नया बनाएं)');
assert(translateKey('Save', 'kn') === 'ಉಳಿಸಿ', 'Save -> Kannada (ಉಳಿಸಿ)');
assert(translateKey('Save', 'hi') === 'सहेजें', 'Save -> Hindi (सहेजें)');

// 4. Token Protection (Prices, IDs, Codes, URLs, Phones)
console.log('\n4. Token Protection & Preservation:');

const testCases = [
  {
    input: 'Total amount is ₹25,000 for package PKG-2024-001',
    checkPrices: true,
    priceVal: '₹25,000',
    codeVal: 'PKG-2024-001',
  },
  {
    input: 'Booking BKG-98765 advance received ₹1,50,000 via UPI',
    checkPrices: true,
    priceVal: '₹1,50,000',
    codeVal: 'BKG-98765',
  },
  {
    input: 'Call +919876543210 or email support@ooting.com at https://ooting.in',
    phoneVal: '+919876543210',
    emailVal: 'support@ooting.com',
    urlVal: 'https://ooting.in',
  },
];

testCases.forEach((tc, idx) => {
  const { protectedText, tokens } = TranslatorService.protectTokens(tc.input);
  assert(protectedText !== tc.input, `Case ${idx + 1}: Protected text masked correctly`);
  
  const restored = TranslatorService.restoreTokens(protectedText, tokens);
  assert(restored === tc.input, `Case ${idx + 1}: Exact token restoration (${restored})`);

  if (tc.priceVal) {
    assert(Object.values(tokens).includes(tc.priceVal), `Case ${idx + 1}: Price ${tc.priceVal} protected`);
  }
  if (tc.codeVal) {
    assert(Object.values(tokens).includes(tc.codeVal), `Case ${idx + 1}: Code ${tc.codeVal} protected`);
  }
  if (tc.phoneVal) {
    assert(Object.values(tokens).includes(tc.phoneVal), `Case ${idx + 1}: Phone ${tc.phoneVal} protected`);
  }
  if (tc.emailVal) {
    assert(Object.values(tokens).includes(tc.emailVal), `Case ${idx + 1}: Email ${tc.emailVal} protected`);
  }
  if (tc.urlVal) {
    assert(Object.values(tokens).includes(tc.urlVal), `Case ${idx + 1}: URL ${tc.urlVal} protected`);
  }
});

// 5. Translator Synchronous Call
console.log('\n5. Synchronous Translation Behavior:');
assert(TranslatorService.translate('Dashboard', 'en') === 'Dashboard', 'English returns original text');
assert(TranslatorService.translate('Dashboard', 'kn') === 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'Kannada returns dictionary translation');
assert(TranslatorService.translate('Dashboard', 'hi') === 'डैशबोर्ड', 'Hindi returns dictionary translation');
assert(TranslatorService.translate('12345', 'kn') === '12345', 'Pure numbers returned as-is');
assert(TranslatorService.translate('₹50,000', 'kn') === '₹50,000', 'Pure prices returned as-is');

console.log('\n========================================');
console.log(`Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL MULTILINGUAL TESTS PASSED SUCCESSFULLY! ✓\n');
  process.exit(0);
}
