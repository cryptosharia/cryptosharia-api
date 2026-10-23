import { config } from 'dotenv';
config({ path: '.env.test', override: true });

process.env.PASSWORD_RESET_ADMIN_ORIGIN ||= 'http://127.0.0.1:4173';
process.env.PASSWORD_RESET_LEARNING_ORIGIN ||= 'http://127.0.0.1:4174';
