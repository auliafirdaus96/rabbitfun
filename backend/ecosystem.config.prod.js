// ==============================================
// Rabbit Launchpad - PM2 Production Configuration
// ==============================================

module.exports = {
  apps: [
    {
      name: 'rabbit-launchpad-api',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://username:password@localhost:5432/rabbit_launchpad_prod',
        REDIS_URL: 'redis://localhost:6379'
      },

      // Process Management
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',

      // Performance
      node_args: '--max-old-space-size=2048',

      // Health Check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Deployment
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Security
      umask: '0002'
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:rabbitlaunchpad/rabbit-launchpad.git',
      path: '/var/www/rabbit-launchpad',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    },

    staging: {
      user: 'node',
      host: 'staging-server-ip',
      ref: 'origin/develop',
      repo: 'git@github.com:rabbitlaunchpad/rabbit-launchpad.git',
      path: '/var/www/rabbit-launchpad-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};