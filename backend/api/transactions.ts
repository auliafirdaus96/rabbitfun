import productionDatabaseService from '../src/services/productionDatabaseService';

// Transaction Management API with real database integration
export default async function handler(req: any, res: any) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        return getTransactions(req, res);

      case 'POST':
        return createTransaction(req, res);

      case 'PUT':
        return updateTransaction(req, res);

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Method ${method} not allowed`
        });
    }
  } catch (error: any) {
    console.error('Transaction API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// GET /api/transactions - Get transactions with filtering
async function getTransactions(req: any, res: any) {
  const {
    page = 1,
    limit = 20,
    tokenId,
    traderAddress,
    type,
    status
  } = req.query;

  try {
    const result = await productionDatabaseService.getTransactions({
      page: parseInt(page),
      limit: parseInt(limit),
      tokenId,
      traderAddress,
      type: type as any,
      status,
    });

    return res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
      message: 'Transactions retrieved successfully from database'
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message
    });
  }
}

// POST /api/transactions - Create new transaction
async function createTransaction(req: any, res: any) {
  const {
    hash,
    blockNumber,
    blockHash,
    transactionIndex,
    type,
    tokenId,
    tokenAddress,
    traderAddress,
    tokenAmount,
    bnbAmount,
    price,
    platformFee,
    creatorFee,
    totalFee,
    priceImpact
  } = req.body;

  // Validation
  if (!hash || !blockNumber || !type || !tokenId || !tokenAddress || !tokenAmount || !bnbAmount || !price) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Hash, block number, type, token ID, token address, amounts, and price are required'
    });
  }

  try {
    const newTransaction = await productionDatabaseService.createTransaction({
      hash,
      blockNumber: blockNumber.toString(),
      blockHash,
      transactionIndex: parseInt(transactionIndex),
      type: type.toUpperCase() as 'BUY' | 'SELL',
      tokenId,
      tokenAddress: tokenAddress.toLowerCase(),
      traderAddress: traderAddress?.toLowerCase(),
      tokenAmount,
      bnbAmount,
      price,
      platformFee,
      creatorFee,
      totalFee,
      priceImpact,
    });

    return res.status(201).json({
      success: true,
      data: newTransaction,
      message: 'Transaction created successfully in database'
    });
  } catch (error: any) {
    console.error('Error creating transaction:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Transaction already exists',
        message: 'A transaction with this hash already exists in the database'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create transaction',
      message: error.message
    });
  }
}

// PUT /api/transactions - Update transaction status
async function updateTransaction(req: any, res: any) {
  const { hash, status, gasUsed, gasPrice, errorMessage } = req.body;

  if (!hash || !status) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Transaction hash and status are required'
    });
  }

  try {
    const updateData: any = {
      status: status.toUpperCase(),
    };

    if (gasUsed) updateData.gasUsed = gasUsed.toString();
    if (gasPrice) updateData.gasPrice = gasPrice.toString();
    if (errorMessage) updateData.errorMessage = errorMessage;
    if (status.toUpperCase() === 'CONFIRMED') {
      updateData.confirmedAt = new Date();
    }

    const updatedTransaction = await productionDatabaseService.updateTransactionStatus(
      hash,
      updateData
    );

    return res.status(200).json({
      success: true,
      data: updatedTransaction,
      message: 'Transaction status updated successfully in database'
    });
  } catch (error: any) {
    console.error('Error updating transaction:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        message: 'Transaction with the specified hash does not exist'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update transaction',
      message: error.message
    });
  }
}