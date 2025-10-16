const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { performance } = require('perf_hooks');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.checks = new Map();
    this.isRunning = false;
    this.config = require('../config').monitoring;

    // Initialize alert channels
    this.initializeAlertChannels();

    // Setup system monitoring
    this.setupSystemMonitoring();

    console.log('✅ Monitoring service initialized');
  }

  async initializeAlertChannels() {
    try {
      // Email transporter
      if (this.config.alerts.email.enabled) {
        this.emailTransporter = nodemailer.createTransporter({
          host: this.config.alerts.email.smtp.host,
          port: this.config.alerts.email.smtp.port,
          secure: this.config.alerts.email.smtp.secure,
          auth: {
            user: this.config.alerts.email.smtp.auth.user,
            pass: this.config.alerts.email.smtp.auth.pass
          }
        });
      }

      // Discord webhook
      if (this.config.alerts.discord.enabled && this.config.alerts.discord.webhookUrl) {
        this.discordWebhookUrl = this.config.alerts.discord.webhookUrl;
      }

      // Telegram bot
      if (this.config.alerts.telegram.enabled && this.config.alerts.telegram.botToken) {
        this.telegramBotToken = this.config.alerts.telegram.botToken;
        this.telegramChatId = this.config.alerts.telegram.chatId;
      }

      console.log('✅ Alert channels initialized');
    } catch (error) {
      console.error('❌ Failed to initialize alert channels:', error);
    }
  }

  setupSystemMonitoring() {
    // System metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute

    // Health checks
    setInterval(() => {
      this.runHealthChecks();
    }, 30000); // Every 30 seconds

    // Log monitoring
    this.setupLogMonitoring();
  }

  async collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const systemLoad = os.loadavg();
      const freeMemory = os.freemem();
      const totalMemory = os.totalmem();

      const metrics = {
        timestamp: new Date(),
        process: {
          memory: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          uptime: process.uptime()
        },
        system: {
          loadAverage: systemLoad,
          memory: {
            free: freeMemory,
            total: totalMemory,
            usage: ((totalMemory - freeMemory) / totalMemory) * 100
          },
          platform: os.platform(),
          arch: os.arch()
        }
      };

      // Store metrics
      this.setMetric('system', metrics);

      // Check for alerts
      await this.checkMetricAlerts(metrics);

      // Emit metrics event
      this.emit('metrics', metrics);

    } catch (error) {
      console.error('❌ Error collecting system metrics:', error);
    }
  }

  async runHealthChecks() {
    try {
      const checks = [
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkBlockchainHealth(),
        this.checkApiHealth(),
        this.checkWebSocketHealth()
      ];

      const results = await Promise.allSettled(checks);
      const healthStatus = {
        timestamp: new Date(),
        overall: 'healthy',
        checks: {}
      };

      results.forEach((result, index) => {
        const checkNames = ['database', 'redis', 'blockchain', 'api', 'websocket'];
        const checkName = checkNames[index];

        if (result.status === 'fulfilled') {
          healthStatus.checks[checkName] = {
            status: 'healthy',
            ...result.value
          };
        } else {
          healthStatus.checks[checkName] = {
            status: 'unhealthy',
            error: result.reason.message
          };
          healthStatus.overall = 'unhealthy';
        }
      });

      // Store health status
      this.setMetric('health', healthStatus);

      // Check for health alerts
      await this.checkHealthAlerts(healthStatus);

      // Emit health status
      this.emit('health', healthStatus);

    } catch (error) {
      console.error('❌ Error running health checks:', error);
    }
  }

  async checkDatabaseHealth() {
    const startTime = performance.now();
    try {
      // Check MongoDB connection
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      // Test database operation
      await mongoose.connection.db.admin().ping();

      const responseTime = performance.now() - startTime;

      return {
        responseTime,
        connected: true,
        status: 'healthy'
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        responseTime,
        connected: false,
        error: error.message,
        status: 'unhealthy'
      };
    }
  }

  async checkRedisHealth() {
    const startTime = performance.now();
    try {
      const redis = require('redis');
      const client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      });

      await client.connect();
      await client.ping();
      await client.disconnect();

      const responseTime = performance.now() - startTime;

      return {
        responseTime,
        connected: true,
        status: 'healthy'
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        responseTime,
        connected: false,
        error: error.message,
        status: 'unhealthy'
      };
    }
  }

  async checkBlockchainHealth() {
    const startTime = performance.now();
    try {
      const { ethers } = require('ethers');
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'
      );

      const blockNumber = await provider.getBlockNumber();
      const responseTime = performance.now() - startTime;

      return {
        responseTime,
        blockNumber,
        connected: true,
        status: 'healthy'
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        responseTime,
        connected: false,
        error: error.message,
        status: 'unhealthy'
      };
    }
  }

  async checkApiHealth() {
    const startTime = performance.now();
    try {
      const response = await axios.get('http://localhost:3001/health', {
        timeout: 5000
      });

      const responseTime = performance.now() - startTime;

      return {
        responseTime,
        statusCode: response.status,
        status: response.status === 200 ? 'healthy' : 'unhealthy'
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        responseTime,
        error: error.message,
        status: 'unhealthy'
      };
    }
  }

  async checkWebSocketHealth() {
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:3002');

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.terminate();
          resolve({
            connected: false,
            error: 'Connection timeout',
            status: 'unhealthy'
          });
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          resolve({
            connected: true,
            status: 'healthy'
          });
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          resolve({
            connected: false,
            error: error.message,
            status: 'unhealthy'
          });
        });
      });
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        status: 'unhealthy'
      };
    }
  }

  setupLogMonitoring() {
    // Monitor error logs
    setInterval(async () => {
      await this.checkErrorLogs();
    }, 60000); // Every minute
  }

  async checkErrorLogs() {
    try {
      const logPath = path.join(__dirname, '../logs/error.log');
      const stats = await fs.stat(logPath).catch(() => null);

      if (stats && stats.size > 0) {
        // Check recent error rate
        const recentErrors = await this.getRecentErrors();

        if (recentErrors.length > 10) { // More than 10 errors in last minute
          await this.sendAlert('high_error_rate', {
            message: `High error rate detected: ${recentErrors.length} errors in the last minute`,
            errors: recentErrors.slice(0, 5) // Include first 5 errors
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking logs:', error);
    }
  }

  async getRecentErrors() {
    // Implementation to read recent errors from log file
    return [];
  }

  async checkMetricAlerts(metrics) {
    try {
      // Memory usage alert
      const memoryUsage = (metrics.process.memory.heapUsed / metrics.process.memory.heapTotal) * 100;
      if (memoryUsage > 90) {
        await this.sendAlert('high_memory_usage', {
          message: `High memory usage: ${memoryUsage.toFixed(2)}%`,
          usage: memoryUsage
        });
      }

      // System load alert
      const systemLoad = metrics.system.loadAverage[0];
      const cpuCount = os.cpus().length;
      if (systemLoad > cpuCount * 2) {
        await this.sendAlert('high_system_load', {
          message: `High system load: ${systemLoad.toFixed(2)}`,
          load: systemLoad,
          cpuCount
        });
      }

      // Memory usage system alert
      if (metrics.system.memory.usage > 90) {
        await this.sendAlert('high_system_memory', {
          message: `High system memory usage: ${metrics.system.memory.usage.toFixed(2)}%`,
          usage: metrics.system.memory.usage
        });
      }

    } catch (error) {
      console.error('❌ Error checking metric alerts:', error);
    }
  }

  async checkHealthAlerts(healthStatus) {
    try {
      if (healthStatus.overall === 'unhealthy') {
        const unhealthyServices = Object.entries(healthStatus.checks)
          .filter(([service, check]) => check.status === 'unhealthy')
          .map(([service]) => service);

        await this.sendAlert('service_unhealthy', {
          message: `Service health check failed: ${unhealthyServices.join(', ')}`,
          services: unhealthyServices,
          details: healthStatus.checks
        });
      }

      // Check response times
      for (const [service, check] of Object.entries(healthStatus.checks)) {
        if (check.responseTime && check.responseTime > 5000) { // 5 seconds
          await this.sendAlert('slow_response', {
            message: `Slow response time from ${service}: ${check.responseTime.toFixed(2)}ms`,
            service,
            responseTime: check.responseTime
          });
        }
      }

    } catch (error) {
      console.error('❌ Error checking health alerts:', error);
    }
  }

  async sendAlert(type, data) {
    try {
      const alertKey = `${type}_${Date.now()}`;
      const alert = {
        id: alertKey,
        type,
        data,
        timestamp: new Date(),
        severity: this.getAlertSeverity(type)
      };

      // Store alert
      this.alerts.set(alertKey, alert);

      // Prevent alert spamming
      if (this.isAlertSpamming(type)) {
        console.log(`⚠️ Alert ${type} suppressed due to rate limiting`);
        return;
      }

      // Send to all configured channels
      await Promise.all([
        this.sendEmailAlert(alert),
        this.sendDiscordAlert(alert),
        this.sendTelegramAlert(alert)
      ]);

      // Emit alert event
      this.emit('alert', alert);

      console.log(`🚨 Alert sent: ${type} - ${data.message}`);

    } catch (error) {
      console.error('❌ Error sending alert:', error);
    }
  }

  getAlertSeverity(type) {
    const severityMap = {
      'high_memory_usage': 'warning',
      'high_system_load': 'warning',
      'high_system_memory': 'warning',
      'service_unhealthy': 'critical',
      'slow_response': 'warning',
      'high_error_rate': 'critical',
      'database_connection_lost': 'critical',
      'blockchain_sync_failed': 'critical'
    };

    return severityMap[type] || 'info';
  }

  isAlertSpamming(type) {
    const recentAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.type === type)
      .filter(alert => Date.now() - alert.timestamp.getTime() < 300000); // 5 minutes

    return recentAlerts.length >= 3; // Max 3 alerts of same type in 5 minutes
  }

  async sendEmailAlert(alert) {
    try {
      if (!this.emailTransporter || !this.config.alerts.email.enabled) {
        return;
      }

      const subject = `[${alert.severity.toUpperCase()}] Ahiru Launchpad Alert: ${alert.type}`;
      const html = this.generateEmailTemplate(alert);

      await this.emailTransporter.sendMail({
        from: this.config.alerts.email.from,
        to: this.config.alerts.email.to,
        subject,
        html
      });

    } catch (error) {
      console.error('❌ Error sending email alert:', error);
    }
  }

  async sendDiscordAlert(alert) {
    try {
      if (!this.discordWebhookUrl || !this.config.alerts.discord.enabled) {
        return;
      }

      const embed = {
        title: `🚨 ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
        description: alert.data.message,
        color: this.getDiscordColor(alert.severity),
        timestamp: alert.timestamp.toISOString(),
        fields: []
      };

      // Add additional data as fields
      Object.entries(alert.data).forEach(([key, value]) => {
        if (key !== 'message' && value !== undefined) {
          embed.fields.push({
            name: key.replace(/_/g, ' ').toUpperCase(),
            value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
            inline: true
          });
        }
      });

      await axios.post(this.discordWebhookUrl, {
        embeds: [embed]
      });

    } catch (error) {
      console.error('❌ Error sending Discord alert:', error);
    }
  }

  async sendTelegramAlert(alert) {
    try {
      if (!this.telegramBotToken || !this.telegramChatId || !this.config.alerts.telegram.enabled) {
        return;
      }

      const message = this.generateTelegramMessage(alert);

      await axios.post(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
        chat_id: this.telegramChatId,
        text: message,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('❌ Error sending Telegram alert:', error);
    }
  }

  generateEmailTemplate(alert) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Ahiru Launchpad Alert</h1>
          <p style="color: white; margin: 5px 0 0 0;">${alert.type.replace(/_/g, ' ').toUpperCase()}</p>
        </div>

        <div style="padding: 20px; background: #f8f9fa;">
          <div style="background: white; padding: 15px; border-left: 4px solid ${this.getAlertColor(alert.severity)}; margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${alert.data.message}</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">
              Severity: <strong>${alert.severity.toUpperCase()}</strong><br>
              Time: ${alert.timestamp.toLocaleString()}
            </p>
          </div>

          ${Object.entries(alert.data).filter(([key]) => key !== 'message').map(([key, value]) => `
            <div style="background: white; padding: 10px; margin-bottom: 10px;">
              <strong>${key.replace(/_/g, ' ').toUpperCase()}:</strong>
              ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            </div>
          `).join('')}
        </div>

        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">This is an automated alert from Ahiru Launchpad monitoring system.</p>
        </div>
      </div>
    `;
  }

  generateTelegramMessage(alert) {
    let message = `🚨 *${alert.type.replace(/_/g, ' ').toUpperCase()}*\n\n`;
    message += `📝 ${alert.data.message}\n`;
    message += `⚡ Severity: ${alert.severity.toUpperCase()}\n`;
    message += `⏰ Time: ${alert.timestamp.toLocaleString()}\n\n`;

    // Add additional data
    Object.entries(alert.data).forEach(([key, value]) => {
      if (key !== 'message' && value !== undefined) {
        message += `📊 ${key.replace(/_/g, ' ').toUpperCase()}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
      }
    });

    return message;
  }

  getDiscordColor(severity) {
    const colors = {
      'info': 0x3498db,    // Blue
      'warning': 0xf39c12, // Orange
      'critical': 0xe74c3c  // Red
    };
    return colors[severity] || 0x95a5a6; // Gray default
  }

  getAlertColor(severity) {
    const colors = {
      'info': '#3498db',
      'warning': '#f39c12',
      'critical': '#e74c3c'
    };
    return colors[severity] || '#95a5a6';
  }

  setMetric(name, value) {
    this.metrics.set(name, {
      value,
      timestamp: new Date()
    });
  }

  getMetric(name) {
    return this.metrics.get(name);
  }

  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }

  getAllAlerts() {
    return Array.from(this.alerts.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 Monitoring service started');
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    console.log('🛑 Monitoring service stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      metricsCount: this.metrics.size,
      alertsCount: this.alerts.size,
      lastCheck: new Date()
    };
  }
}

module.exports = new MonitoringService();