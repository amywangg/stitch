import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import patternRoutes from './routes/patterns.js';
import projectRoutes from './routes/projects.js';
import counterRoutes from './routes/counter.js';
import socialRoutes from './routes/social.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io for real-time features (counter sync, notifications)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/counter', counterRoutes);
app.use('/api/social', socialRoutes);

// Error handling
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user's personal room for notifications
  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`);
  });

  // Join project room for counter sync
  socket.on('join:project', (projectId: string) => {
    socket.join(`project:${projectId}`);
  });

  // Counter updates - broadcast to all viewers of the project
  socket.on('counter:update', (data: {
    projectId: string;
    sectionId: string;
    newRow: number;
    inputType: string;
  }) => {
    socket.to(`project:${data.projectId}`).emit('counter:updated', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in controllers
export { io };

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🧶 Stitch API running on port ${PORT}`);
});


