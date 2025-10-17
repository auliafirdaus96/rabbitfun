// Simple health check untuk Vercel
export default function handler(req: any, res: any) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'RabbitFun Launchpad Backend is running!',
    version: '1.0.0'
  });
}