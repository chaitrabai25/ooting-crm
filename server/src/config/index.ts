import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const CLOUD_TIDB_URL = 'mysql://2AJqT6QgbdvDayf.root:7xCl3FL0jIFUVu5D@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/ooting_crm?sslaccept=strict';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = CLOUD_TIDB_URL;
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'ooting_crm_production_secret_key_2026_super_secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  company: {
    name: process.env.COMPANY_NAME || 'Ooting',
    tagline: process.env.COMPANY_TAGLINE || 'Journeys Beyond Ordinary',
    email: process.env.COMPANY_EMAIL || 'contact@ooting.com',
    phone: process.env.COMPANY_PHONE || '+91 98765 43210',
    address: process.env.COMPANY_ADDRESS || 'Ooting Holidays Private Limited, Bangalore, Karnataka, India',
    website: process.env.COMPANY_WEBSITE || 'https://ooting.in',
    gstin: process.env.COMPANY_GSTIN || '29AABCO1234F1Z5',
  },
};
