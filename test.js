import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: import.meta.dirname + './.env' });

console.log(process.env.SECRET_KEY);
const __filename = fileURLToPath(import.meta.url);
console.log(path.dirname(__filename));
console.log(import.meta);
