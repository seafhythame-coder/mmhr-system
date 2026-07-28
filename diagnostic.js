import dotenv from 'dotenv';
import pg from 'pg';
import axios from 'axios';

dotenv.config();

const { Pool } = pg;

const rawApiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
const apiBaseUrl = /^https?:\/\//i.test(rawApiBaseUrl) ? rawApiBaseUrl : `https://${rawApiBaseUrl}`;

function logResult(name, ok, details = '') {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${name}${details ? ` - ${details}` : ''}`);
}

async function checkDatabase() {
  try {
    const pool = process.env.DATABASE_URL
      ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        })
      : new Pool({
          user: process.env.DB_USER || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'mmhr_db',
          password: process.env.DB_PASSWORD || 'password',
          port: Number(process.env.DB_PORT) || 5432,
        });

    await pool.query('SELECT 1');
    await pool.end();
    logResult('PostgreSQL', true, 'connection OK');
    return true;
  } catch (error) {
    logResult('PostgreSQL', false, error.message);
    return false;
  }
}

async function checkApiHealth() {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/health`, { timeout: 10000 });
    logResult('API Health', true, `${response.status}`);
    return true;
  } catch (error) {
    logResult('API Health', false, error.message);
    return false;
  }
}

async function checkTelegramToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logResult('Telegram Token', false, 'TELEGRAM_BOT_TOKEN is missing');
    return false;
  }

  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, { timeout: 10000 });
    const ok = Boolean(response.data?.ok);
    logResult('Telegram Bot', ok, ok ? response.data?.result?.username || 'token valid' : 'token invalid');
    return ok;
  } catch (error) {
    logResult('Telegram Bot', false, error.message);
    return false;
  }
}

async function checkTwilioCredentials() {
  const sid = process.env.TWILIO_ACCOUNT_SID || process.env.WHATSAPP_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.WHATSAPP_TOKEN;

  if (!sid || !authToken) {
    logResult('WhatsApp (Twilio)', false, 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing');
    return false;
  }

  try {
    await axios.get(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      auth: { username: sid, password: authToken },
      timeout: 10000,
    });
    logResult('WhatsApp (Twilio)', true, 'credentials valid');
    return true;
  } catch (error) {
    logResult('WhatsApp (Twilio)', false, error.message);
    return false;
  }
}

async function main() {
  console.log('🔎 Running MMHR diagnostics...\n');

  const dbOk = await checkDatabase();
  const apiOk = await checkApiHealth();
  const tgOk = await checkTelegramToken();
  const waOk = await checkTwilioCredentials();

  const allOk = dbOk && apiOk && tgOk && waOk;

  console.log(`\n${allOk ? '✅ All checks passed' : '❌ Some checks failed'}`);
  process.exit(allOk ? 0 : 1);
}

main();
