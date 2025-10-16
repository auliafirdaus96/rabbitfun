import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import contractIntegrationService from '../services/contractIntegrationService';
import logger from '../utils/logger';

const router = express.Router();

/**
 * @route GET /api/contract/status
 * @desc Get contract integration status
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const status = contractIntegrationService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    logger.error('Error getting contract status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get contract status'
    });
  }
});

/**
 * @route GET /api/contract/health
 * @desc Perform health check on all services
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = await contractIntegrationService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error: any) {
    logger.error('Error performing health check:', error);
    res.status(503).json({
      success: false,
      error: error.message || 'Health check failed'
    });
  }
});

/**
 * @route GET /api/contract/token/:tokenAddress
 * @desc Get token information from contract
 * @access Public
 */
router.get('/token/:tokenAddress', [
  param('tokenAddress').isEthereumAddress().withMessage('Invalid token address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { tokenAddress } = req.params;
    const contractService = contractIntegrationService.getContractService();

    const tokenInfo = await contractService.getTokenInfo(tokenAddress);

    if (!tokenInfo) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }

    res.json({
      success: true,
      data: tokenInfo
    });
  } catch (error: any) {
    logger.error('Error getting token info:', { tokenAddress: req.params.tokenAddress, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get token information'
    });
  }
});

/**
 * @route GET /api/contract/market/stats
 * @desc Get market statistics
 * @access Public
 */
router.get('/market/stats', async (req, res) => {
  try {
    const marketStats = await contractIntegrationService.getMarketStats();
    res.json({
      success: true,
      data: marketStats
    });
  } catch (error: any) {
    logger.error('Error getting market stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get market statistics'
    });
  }
});

/**
 * @route POST /api/contract/token/create
 * @desc Create a new token
 * @access Private
 */
router.post('/token/create', [
  body('name')
    .isLength({ min: 1, max: 50 })
    .withMessage('Token name must be between 1 and 50 characters'),
  body('symbol')
    .isLength({ min: 1, max: 10 })
    .matches(/^[A-Z]+$/)
    .withMessage('Token symbol must be 1-10 uppercase letters'),
  body('metadata')
    .optional()
    .isURL()
    .withMessage('Metadata must be a valid URL'),
  body('privateKey')
    .optional()
    .isLength({ min: 64, max: 66 })
    .withMessage('Invalid private key format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, symbol, metadata, privateKey } = req.body;
    const contractService = contractIntegrationService.getContractService();

    const result = await contractService.createToken(
      name,
      symbol,
      metadata || '',
      privateKey
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          transactionHash: result.transactionHash,
          gasUsed: result.gasUsed,
          events: result.events
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Token creation failed'
      });
    }
  } catch (error: any) {
    logger.error('Error creating token:', { body: req.body, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create token'
    });
  }
});

/**
 * @route POST /api/contract/token/:tokenAddress/buy
 * @desc Buy tokens
 * @access Private
 */
router.post('/token/:tokenAddress/buy', [
  param('tokenAddress').isEthereumAddress().withMessage('Invalid token address'),
  body('bnbAmount')
    .isFloat({ min: 0.0001 })
    .withMessage('BNB amount must be at least 0.0001'),
  body('minTokensOut')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum tokens out must be positive'),
  body('privateKey')
    .optional()
    .isLength({ min: 64, max: 66 })
    .withMessage('Invalid private key format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { tokenAddress } = req.params;
    const { bnbAmount, minTokensOut, privateKey } = req.body;
    const contractService = contractIntegrationService.getContractService();

    const result = await contractService.buyTokens(
      tokenAddress,
      bnbAmount.toString(),
      minTokensOut?.toString(),
      privateKey
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          transactionHash: result.transactionHash,
          gasUsed: result.gasUsed,
          events: result.events
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Token purchase failed'
      });
    }
  } catch (error: any) {
    logger.error('Error buying tokens:', {
      tokenAddress: req.params.tokenAddress,
      body: req.body,
      error
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to buy tokens'
    });
  }
});

/**
 * @route POST /api/contract/token/:tokenAddress/sell
 * @desc Sell tokens
 * @access Private
 */
router.post('/token/:tokenAddress/sell', [
  param('tokenAddress').isEthereumAddress().withMessage('Invalid token address'),
  body('tokenAmount')
    .isFloat({ min: 0.000001 })
    .withMessage('Token amount must be at least 0.000001'),
  body('minBNBOut')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum BNB out must be positive'),
  body('privateKey')
    .optional()
    .isLength({ min: 64, max: 66 })
    .withMessage('Invalid private key format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { tokenAddress } = req.params;
    const { tokenAmount, minBNBOut, privateKey } = req.body;
    const contractService = contractIntegrationService.getContractService();

    const result = await contractService.sellTokens(
      tokenAddress,
      tokenAmount.toString(),
      minBNBOut?.toString(),
      privateKey
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          transactionHash: result.transactionHash,
          gasUsed: result.gasUsed,
          events: result.events
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Token sale failed'
      });
    }
  } catch (error: any) {
    logger.error('Error selling tokens:', {
      tokenAddress: req.params.tokenAddress,
      body: req.body,
      error
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sell tokens'
    });
  }
});

/**
 * @route GET /api/contract/token/:tokenAddress/balance/:address
 * @desc Get token balance for an address
 * @access Public
 */
router.get('/token/:tokenAddress/balance/:address', [
  param('tokenAddress').isEthereumAddress().withMessage('Invalid token address'),
  param('address').isEthereumAddress().withMessage('Invalid address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { tokenAddress, address } = req.params;
    const contractService = contractIntegrationService.getContractService();

    const balance = await contractService.getTokenBalance(tokenAddress, address);

    res.json({
      success: true,
      data: {
        tokenAddress,
        address,
        balance
      }
    });
  } catch (error: any) {
    logger.error('Error getting token balance:', {
      tokenAddress: req.params.tokenAddress,
      address: req.params.address,
      error
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get token balance'
    });
  }
});

/**
 * @route GET /api/contract/balance/:address
 * @desc Get BNB balance for an address
 * @access Public
 */
router.get('/balance/:address', [
  param('address').isEthereumAddress().withMessage('Invalid address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { address } = req.params;
    const contractService = contractIntegrationService.getContractService();

    const balance = await contractService.getBNBBalance(address);

    res.json({
      success: true,
      data: {
        address,
        balance
      }
    });
  } catch (error: any) {
    logger.error('Error getting BNB balance:', { address: req.params.address, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get BNB balance'
    });
  }
});

/**
 * @route GET /api/contract/transaction/:hash
 * @desc Get transaction details
 * @access Public
 */
router.get('/transaction/:hash', [
  param('hash').isLength({ min: 66, max: 66 }).withMessage('Invalid transaction hash')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { hash } = req.params;
    const contractService = contractIntegrationService.getContractService();

    const receipt = await contractService.getTransactionReceipt(hash);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    const isSuccessful = await contractService.isTransactionSuccessful(hash);

    res.json({
      success: true,
      data: {
        hash,
        receipt,
        isSuccessful
      }
    });
  } catch (error: any) {
    logger.error('Error getting transaction details:', { hash: req.params.hash, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transaction details'
    });
  }
});

/**
 * @route GET /api/contract/bonding-curve/calculate
 * @desc Calculate bonding curve parameters
 * @access Public
 */
router.get('/bonding-curve/calculate', [
  query('bnbAmount').optional().isFloat({ min: 0 }).withMessage('BNB amount must be positive'),
  query('tokenAmount').optional().isFloat({ min: 0 }).withMessage('Token amount must be positive'),
  query('currentSupply').isFloat({ min: 0 }).withMessage('Current supply is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { bnbAmount, tokenAmount, currentSupply } = req.query;
    const contractService = contractIntegrationService.getContractService();

    const currentSupplyFloat = parseFloat(currentSupply as string);
    const result: any = {};

    if (bnbAmount) {
      result.tokensOut = contractService.calculateTokensOut(
        parseFloat(bnbAmount as string),
        currentSupplyFloat
      );
    }

    if (tokenAmount) {
      result.bnbOut = contractService.calculateBNBOut(
        parseFloat(tokenAmount as string),
        currentSupplyFloat
      );
    }

    result.currentPrice = contractService.calculatePrice(currentSupplyFloat);
    result.priceImpact = contractService.calculatePriceImpact(
      parseFloat((bnbAmount || '0') as string),
      currentSupplyFloat
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error calculating bonding curve:', { query: req.query, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate bonding curve parameters'
    });
  }
});

/**
 * @route GET /api/contract/listen/:tokenAddress
 * @desc Start listening to token events
 * @access Private
 */
router.post('/listen/:tokenAddress', [
  param('tokenAddress').isEthereumAddress().withMessage('Invalid token address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { tokenAddress } = req.params;

    await contractIntegrationService.startTokenListening(tokenAddress);

    res.json({
      success: true,
      data: {
        message: `Started listening to token events for ${tokenAddress}`,
        tokenAddress
      }
    });
  } catch (error: any) {
    logger.error('Error starting token listening:', { tokenAddress: req.params.tokenAddress, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start token listening'
    });
  }
});

/**
 * @route DELETE /api/contract/listen/:tokenAddress
 * @desc Stop listening to token events
 * @access Private
 */
router.delete('/listen/:tokenAddress', [
  param('tokenAddress').isEthereumAddress().withMessage('Invalid token address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { tokenAddress } = req.params;

    contractIntegrationService.stopTokenListening(tokenAddress);

    res.json({
      success: true,
      data: {
        message: `Stopped listening to token events for ${tokenAddress}`,
        tokenAddress
      }
    });
  } catch (error: any) {
    logger.error('Error stopping token listening:', { tokenAddress: req.params.tokenAddress, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop token listening'
    });
  }
});

/**
 * @route GET /api/contract/realtime/stats
 * @desc Get real-time service statistics
 * @access Private
 */
router.get('/realtime/stats', async (req, res) => {
  try {
    const realtimeService = contractIntegrationService.getRealtimeService();
    const stats = realtimeService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error getting realtime stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get realtime statistics'
    });
  }
});

/**
 * @route POST /api/contract/broadcast
 * @desc Broadcast message to all connected clients
 * @access Private
 */
router.post('/broadcast', [
  body('type').notEmpty().withMessage('Message type is required'),
  body('data').notEmpty().withMessage('Message data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type, data } = req.body;
    const sentCount = contractIntegrationService.broadcast({ type, data });

    res.json({
      success: true,
      data: {
        message: 'Message broadcasted successfully',
        sentCount,
        type
      }
    });
  } catch (error: any) {
    logger.error('Error broadcasting message:', { body: req.body, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to broadcast message'
    });
  }
});

export default router;