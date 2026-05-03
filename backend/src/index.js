import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
console.log('📁 Cargando .env desde:', envPath);

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Error cargando .env:', result.error);
} else {
  console.log('✅ .env cargado correctamente');
}

import pandascoreRoutes from './routes/pandascore.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', pandascoreRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});