// Development configuration
const config = {
  development: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    logLevel: 'debug',
    cors: {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true
    }
  },
  
  production: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0',
    logLevel: 'info',
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }
  },

  test: {
    port: 3001,
    host: 'localhost',
    logLevel: 'error'
  }
};

const env = process.env.NODE_ENV || 'development';

module.exports = config[env] || config.development;