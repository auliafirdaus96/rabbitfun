import { Router } from 'express';
import { tokenController } from '../controllers/TokenController';
import { validate, validateParams, validateQuery } from '../middleware/validation';
import { optionalAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimit';
import {
  tokenAddressSchema,
  paginationSchema,
  buyTokensSchema,
  sellTokensSchema
} from '../utils/validationSchemas';

/**
 * @swagger
 * tags:
 *   name: Tokens
 *   description: Token management and trading operations
 */

const router = Router();

// Public routes (no authentication required)

/**
 * @swagger
 * /tokens:
 *   get:
 *     summary: Get all tokens with pagination
 *     tags: [Tokens]
 *     description: Retrieve a paginated list of all tokens on the platform
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of tokens per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, marketCap, volume, raisedAmount]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for token names or symbols
 *       - in: query
 *         name: creator
 *         schema:
 *           type: string
 *         description: Filter by creator address
 *       - in: query
 *         name: graduated
 *         schema:
 *           type: boolean
 *         description: Filter by graduation status
 *     responses:
 *       200:
 *         description: Successfully retrieved tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Token'
 *                     pagination:
 *                       $ref: '#/components/schemas/ApiResponse#/properties/pagination'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/',
  generalLimiter,
  validateQuery(paginationSchema),
  tokenController.getAllTokens.bind(tokenController)
);

/**
 * @swagger
 * /tokens/{tokenAddress}:
 *   get:
 *     summary: Get token information
 *     tags: [Tokens]
 *     description: Retrieve detailed information about a specific token
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *         description: Token contract address
 *     responses:
 *       200:
 *         description: Successfully retrieved token information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Token'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:tokenAddress',
  generalLimiter,
  validateParams(tokenAddressSchema),
  tokenController.getTokenInfo.bind(tokenController)
);

// GET /api/tokens/:tokenAddress/bonding-curve - Get bonding curve stats
router.get('/:tokenAddress/bonding-curve',
  generalLimiter,
  validateParams(tokenAddressSchema),
  tokenController.getBondingCurveStats.bind(tokenController)
);

// POST /api/tokens/calculate/buy - Calculate token purchase
router.post('/calculate/buy',
  generalLimiter,
  validate(buyTokensSchema),
  optionalAuth,
  tokenController.calculateTokenPurchase.bind(tokenController)
);

// POST /api/tokens/calculate/sell - Calculate token sale
router.post('/calculate/sell',
  generalLimiter,
  validate(sellTokensSchema),
  optionalAuth,
  tokenController.calculateTokenSale.bind(tokenController)
);

export default router;