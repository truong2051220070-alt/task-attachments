import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import * as taskController from './src/controllers/taskController.js';
import * as chatController from './src/controllers/chatController.js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Task Routes
app.get('/api/tasks', taskController.listTasks);
app.post('/api/tasks', upload.single('file'), taskController.createTask);
app.patch('/api/tasks/:id/status', taskController.updateTaskStatus);
app.post('/api/tasks/:id/attachment', upload.single('file'), taskController.uploadAttachment);
app.delete('/api/tasks/:id/attachment', taskController.deleteAttachment);

// Chat Routes
app.get('/api/messages', chatController.listMessages);
app.post('/api/messages', chatController.sendMessage);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
