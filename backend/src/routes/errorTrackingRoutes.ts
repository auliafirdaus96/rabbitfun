import { Router } from 'express';
import { errorTrackingService } from '../services/errorTrackingService';
import { enhancedErrorHandler, asyncHandler, createValidationError } from '../middleware/enhancedErrorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Apply authentication to all error tracking routes
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Error Tracking
 *   description: Error monitoring and management endpoints
 */

/**
 * @swagger
 * /errors/dashboard:
 *   get:
 *     summary: Get error tracking dashboard data
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalErrors:
 *                           type: number
 *                         unresolvedErrors:
 *                           type: number
 *                         criticalErrors:
 *                           type: number
 *                         resolutionRate:
 *                           type: number
 *                     byCategory:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                     bySeverity:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           count:
 *                             type: number
 *                     topErrors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           error:
 *                             $ref: '#/components/schemas/TrackedError'
 *                           count:
 *                             type: number
 *                     recentErrors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TrackedError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const dashboard = await errorTrackingService.getErrorDashboard();

  res.json({
    success: true,
    data: dashboard
  });
}));

/**
 * @swagger
 * /errors:
 *   get:
 *     summary: Get paginated list of errors
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [validation, authentication, authorization, database, network, external_api, business_logic, system, unknown]
 *         description: Filter by error category
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by error severity
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *         description: Filter by resolution status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of errors per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of errors to skip
 *     responses:
 *       200:
 *         description: Errors retrieved successfully
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
 *                     errors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TrackedError'
 *                     total:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    category,
    severity,
    resolved,
    limit = 50,
    offset = 0
  } = req.query;

  const params = {
    ...(category && { category }),
    ...(severity && { severity }),
    ...(resolved !== undefined && { resolved: resolved === 'true' }),
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  };

  const result = await errorTrackingService.getErrors(params);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @swagger
 * /errors/{errorId}:
 *   get:
 *     summary: Get specific error details
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: errorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Error ID
 *     responses:
 *       200:
 *         description: Error details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TrackedError'
 *       404:
 *         description: Error not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: Error not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:errorId', asyncHandler(async (req, res) => {
  const { errorId } = req.params;

  const error = await errorTrackingService.getError(errorId);

  if (!error) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Error not found'
      }
    });
  }

  res.json({
    success: true,
    data: error
  });
}));

/**
 * @swagger
 * /errors/{errorId}/resolve:
 *   post:
 *     summary: Mark an error as resolved
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: errorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Error ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolvedBy
 *             properties:
 *               resolvedBy:
 *                 type: string
 *                 description: User who resolved the error
 *                 example: admin@example.com
 *               notes:
 *                 type: string
 *                 description: Resolution notes
 *                 example: Fixed in PR #123
 *     responses:
 *       200:
 *         description: Error resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Error marked as resolved
 *       404:
 *         description: Error not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:errorId/resolve', asyncHandler(async (req, res) => {
  const { errorId } = req.params;
  const { resolvedBy, notes } = req.body;

  if (!resolvedBy) {
    throw createValidationError('resolvedBy field is required');
  }

  const success = await errorTrackingService.resolveError(errorId, resolvedBy);

  if (!success) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Error not found'
      }
    });
  }

  res.json({
    success: true,
    message: 'Error marked as resolved',
    data: { errorId, resolvedBy, resolvedAt: new Date() }
  });
}));

/**
 * @swagger
 * /errors/metrics:
 *   get:
 *     summary: Get error metrics and statistics
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
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
 *                     totalErrors:
 *                       type: integer
 *                     errorsByCategory:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     errorsBySeverity:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     errorsOverTime:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           count:
 *                             type: integer
 *                     topErrors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           error:
 *                             $ref: '#/components/schemas/TrackedError'
 *                           count:
 *                             type: integer
 *                     resolutionRate:
 *                       type: number
 *                     averageResolutionTime:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = errorTrackingService.getMetrics();

  res.json({
    success: true,
    data: metrics
  });
}));

/**
 * @swagger
 * /errors/test:
 *   post:
 *     summary: Test error tracking (development only)
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [validation, authentication, database, external_api, critical]
 *                 description: Type of test error to generate
 *               message:
 *                 type: string
 *                 description: Custom error message
 *                 example: This is a test error
 *     responses:
 *       200:
 *         description: Test error generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Test error generated
 *                 errorId:
 *                   type: string
 *                   example: abc123def456
 *       400:
 *         description: Invalid error type
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/test', asyncHandler(async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Test endpoint not available in production'
      }
    });
  }

  const { type, message } = req.body;

  if (!type) {
    throw createValidationError('type field is required');
  }

  let testError: Error;
  const context = {
    userId: req.user?.id,
    path: '/errors/test',
    method: 'POST',
    additionalData: { testError: true }
  };

  switch (type) {
    case 'validation':
      testError = new Error(message || 'Test validation error');
      break;
    case 'authentication':
      testError = new Error(message || 'Test authentication error');
      break;
    case 'database':
      testError = new Error(message || 'Test database error');
      break;
    case 'external_api':
      testError = new Error(message || 'Test external API error');
      break;
    case 'critical':
      testError = new Error(message || 'Test critical system error');
      break;
    default:
      throw createValidationError('Invalid error type');
  }

  const errorId = await errorTrackingService.trackError(testError, context);

  res.json({
    success: true,
    message: 'Test error generated',
    errorId
  });
}));

export default router;