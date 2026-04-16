require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const createError = require('http-errors');

const { connectDB } = require('./config/db');
const searchRoutes = require('./src/routes/searchRoutes');
const fileRoutes = require('./src/routes/fileRoutes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  })
);
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
  if(process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 500),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// API Routes - Versioned v1
app.use('/api/v1', searchRoutes);
app.use('/api/v1', fileRoutes);

// Legacy route support (backward compatibility)
// const legacyRouter = require('./routes/route');
// app.use('/api', legacyRouter);

// Express 5 route matching can be stricter about wildcard patterns, so use
// a simple middleware fallback.
app.use((req, res, next) => {
  next(createError(404, `Route not found: ${req.originalUrl}`));
});

// Centralized error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Avoid leaking stack traces in production.
  const payload = {
    error: message,
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.details = err.stack;
  }

  res.status(statusCode).json(payload);
});

const port = Number(process.env.PORT || 3000);

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`[api] Listening on port ${port}`);
  });
}

// Start only when executed directly (not when required by tests/tools).
if (require.main === module) {
  start().catch((err) => {
    console.error('[api] Failed to start', err);
    process.exit(1);
  });
}

module.exports = app;
