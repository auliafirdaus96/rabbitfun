import { Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class WebhookController {
  static async handleMoralisWebhook(req: Request, res: Response) {
    try {
      // Verify webhook signature
      const signature = req.headers['x-moralis-signature'] as string;
      const webhookSecret = process.env.WEBHOOK_SECRET!;

      if (!signature) {
        console.error('Missing Moralis webhook signature');
        return res.status(401).json({ error: 'Missing signature' });
      }

      // TODO: Implement signature verification
      // const isValidSignature = await verifyWebhookSignature(signature, JSON.stringify(req.body), webhookSecret);
      // if (!isValidSignature) {
      //   return res.status(401).json({ error: 'Invalid signature' });
      // }

      const webhookData = req.body;
      console.log('Received Moralis webhook:', JSON.stringify(webhookData, null, 2));

      // Handle different webhook types
      switch (webhookData.event) {
        case 'token.created':
          await this.handleTokenCreated(webhookData);
          break;
        case 'token.bought':
          await this.handleTokenBought(webhookData);
          break;
        case 'token.sold':
          await this.handleTokenSold(webhookData);
          break;
        case 'liquidity.added':
          await this.handleLiquidityAdded(webhookData);
          break;
        case 'liquidity.removed':
          await this.handleLiquidityRemoved(webhookData);
          break;
        default:
          console.log(`Unhandled webhook event: ${webhookData.event}`);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error handling Moralis webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private static async handleTokenCreated(data: any) {
    try {
      const { contractAddress, creator, name, symbol, totalSupply, timestamp } = data;

      // TODO: Save to database when database is ready
      // await prisma.token.create({
      //   data: {
      //     address: contractAddress,
      //     name,
      //     symbol,
      //     totalSupply,
      //     creator,
      //     createdAt: new Date(timestamp * 1000),
      //     isActive: true,
      //   },
      // });

      console.log(`Token created: ${name} (${symbol}) at ${contractAddress}`);
    } catch (error) {
      console.error('Error handling token created event:', error);
      throw error;
    }
  }

  private static async handleTokenBought(data: any) {
    try {
      const { buyer, tokenAddress, amount, ethAmount, timestamp, txHash } = data;

      // TODO: Save to database when database is ready
      // await prisma.token.update({
      //   where: { address: tokenAddress },
      //   data: {
      //     totalBought: { increment: parseFloat(amount) },
      //     totalVolumeEth: { increment: parseFloat(ethAmount) },
      //     lastTradeAt: new Date(timestamp * 1000),
      //   },
      // });

      console.log(`Token bought: ${amount} tokens for ${ethAmount} ETH by ${buyer}`);
    } catch (error) {
      console.error('Error handling token bought event:', error);
      throw error;
    }
  }

  private static async handleTokenSold(data: any) {
    try {
      const { seller, tokenAddress, amount, ethAmount, timestamp, txHash } = data;

      // TODO: Save to database when database is ready
      // await prisma.token.update({
      //   where: { address: tokenAddress },
      //   data: {
      //     totalSold: { increment: parseFloat(amount) },
      //     totalVolumeEth: { increment: parseFloat(ethAmount) },
      //     lastTradeAt: new Date(timestamp * 1000),
      //   },
      // });

      console.log(`Token sold: ${amount} tokens for ${ethAmount} ETH by ${seller}`);
    } catch (error) {
      console.error('Error handling token sold event:', error);
      throw error;
    }
  }

  private static async handleLiquidityAdded(data: any) {
    try {
      const { provider, tokenAddress, tokenAmount, ethAmount, timestamp, txHash } = data;

      // TODO: Save to database when database is ready
      // await prisma.token.update({
      //   where: { address: tokenAddress },
      //   data: {
      //     liquidity: { increment: parseFloat(ethAmount) },
      //     liquidityTokenAmount: { increment: parseFloat(tokenAmount) },
      //   },
      // });

      console.log(`Liquidity added: ${tokenAmount} tokens + ${ethAmount} ETH by ${provider}`);
    } catch (error) {
      console.error('Error handling liquidity added event:', error);
      throw error;
    }
  }

  private static async handleLiquidityRemoved(data: any) {
    try {
      const { provider, tokenAddress, tokenAmount, ethAmount, timestamp, txHash } = data;

      // TODO: Save to database when database is ready
      // await prisma.token.update({
      //   where: { address: tokenAddress },
      //   data: {
      //     liquidity: { decrement: parseFloat(ethAmount) },
      //     liquidityTokenAmount: { decrement: parseFloat(tokenAmount) },
      //   },
      // });

      console.log(`Liquidity removed: ${tokenAmount} tokens + ${ethAmount} ETH by ${provider}`);
    } catch (error) {
      console.error('Error handling liquidity removed event:', error);
      throw error;
    }
  }

  static async handleHealthCheck(_req: Request, res: Response) {
    try {
      const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        webhooks: {
          moralis: 'configured',
          alchemy: 'configured',
        },
        environment: process.env.NODE_ENV,
        uptime: process.uptime(),
      };

      res.status(200).json(status);
    } catch (error) {
      console.error('Webhook health check error:', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  }

  static async getWebhookStats(_req: Request, res: Response) {
    try {
      // TODO: Implement when database is ready
      const stats = {
        totalEvents: 0,
        eventsByType: {},
        recentWebhooks: []
      };

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching webhook stats:', error);
      res.status(500).json({ error: 'Failed to fetch webhook stats' });
    }
  }
}

export default WebhookController;