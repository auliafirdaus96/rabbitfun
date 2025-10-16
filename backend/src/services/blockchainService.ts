import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Type definitions for API responses
interface AlchemyResponse<T = any> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

interface MoralisResponse<T = any> {
  status: string;
  result?: T;
  error?: {
    message: string;
    code: string;
  };
}

// Alchemy Service
export class AlchemyService {
  private apiKey: string;
  private network: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ALCHEMY_API_KEY!;
    this.network = process.env.ALCHEMY_NETWORK || 'bnb-testnet';
    this.baseUrl = `https://${this.network}.g.alchemy.com/v2/${this.apiKey}`;
  }

  async getBalance(address: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });

      const data = await response.json() as AlchemyResponse<any>;
      if (data.error) {
        throw new Error(`Alchemy error: ${data.error.message}`);
      }

      return data.result!;
    } catch (error) {
      console.error('Error fetching balance from Alchemy:', error);
      throw error;
    }
  }

  async getTransactionReceipt(txHash: string) {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: 1,
        }),
      });

      const data = await response.json() as AlchemyResponse<any>;
      if (data.error) {
        throw new Error(`Alchemy error: ${data.error.message}`);
      }

      return data.result!;
    } catch (error) {
      console.error('Error fetching transaction receipt from Alchemy:', error);
      throw error;
    }
  }

  async getBlockNumber(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });

      const data = await response.json() as AlchemyResponse<string>;
      if (data.error) {
        throw new Error(`Alchemy error: ${data.error.message}`);
      }

      return parseInt(data.result!, 16);
    } catch (error) {
      console.error('Error fetching block number from Alchemy:', error);
      throw error;
    }
  }

  async getLogs(params: any) {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [params],
          id: 1,
        }),
      });

      const data = await response.json() as AlchemyResponse<any>;
      if (data.error) {
        throw new Error(`Alchemy error: ${data.error.message}`);
      }

      return data.result!;
    } catch (error) {
      console.error('Error fetching logs from Alchemy:', error);
      throw error;
    }
  }
}

// Moralis Service
export class MoralisService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.MORALIS_API_KEY!;
    this.baseUrl = 'https://api.moralis.io/api/v2';
  }

  async getContractEvents(address: string, fromBlock: number, toBlock: number) {
    try {
      const response = await fetch(
        `${this.baseUrl}/events?address=${address}&from_block=${fromBlock}&to_block=${toBlock}&chain=bsc`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching contract events from Moralis:', error);
      throw error;
    }
  }

  async getTransactions(address: string, fromBlock: number, toBlock: number) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${address}?from_block=${fromBlock}&to_block=${toBlock}&chain=bsc`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching transactions from Moralis:', error);
      throw error;
    }
  }

  async getNFTMetadata(address: string, tokenId: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/nft/${address}/${tokenId}?chain=bsc&format=decimal`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching NFT metadata from Moralis:', error);
      throw error;
    }
  }

  async getWalletNFTs(address: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${address}/nft?chain=bsc&format=decimal`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching wallet NFTs from Moralis:', error);
      throw error;
    }
  }

  async getTokenPrice(address: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/erc20/${address}/price?chain=bsc`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching token price from Moralis:', error);
      throw error;
    }
  }

  async createStream(options: {
    webhookUrl: string;
    description: string;
    tag: string;
    address: string[];
    abi: any[];
  }) {
    try {
      const response = await fetch('https://api.moralis.io/streams/evm', {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Moralis stream:', error);
      throw error;
    }
  }

  async updateStream(streamId: string, options: any) {
    try {
      const response = await fetch(`https://api.moralis.io/streams/evm/${streamId}`, {
        method: 'PUT',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating Moralis stream:', error);
      throw error;
    }
  }

  async deleteStream(streamId: string) {
    try {
      const response = await fetch(`https://api.moralis.io/streams/evm/${streamId}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting Moralis stream:', error);
      throw error;
    }
  }

  async getStreams() {
    try {
      const response = await fetch('https://api.moralis.io/streams/evm', {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Moralis streams:', error);
      throw error;
    }
  }
}

// Combined Blockchain Service
export class BlockchainService {
  private alchemy: AlchemyService;
  private moralis: MoralisService;

  constructor() {
    this.alchemy = new AlchemyService();
    this.moralis = new MoralisService();
  }

  // Alchemy methods
  async getBalance(address: string): Promise<string> {
    return this.alchemy.getBalance(address);
  }

  async getTransactionReceipt(txHash: string) {
    return this.alchemy.getTransactionReceipt(txHash);
  }

  async getBlockNumber(): Promise<number> {
    return this.alchemy.getBlockNumber();
  }

  async getLogs(params: any) {
    return this.alchemy.getLogs(params);
  }

  // Moralis methods
  async getContractEvents(address: string, fromBlock: number, toBlock: number) {
    return this.moralis.getContractEvents(address, fromBlock, toBlock);
  }

  async getTransactions(address: string, fromBlock: number, toBlock: number) {
    return this.moralis.getTransactions(address, fromBlock, toBlock);
  }

  async getNFTMetadata(address: string, tokenId: string) {
    return this.moralis.getNFTMetadata(address, tokenId);
  }

  async getWalletNFTs(address: string) {
    return this.moralis.getWalletNFTs(address);
  }

  async getTokenPrice(address: string) {
    return this.moralis.getTokenPrice(address);
  }

  // Stream methods
  async createStream(options: {
    webhookUrl: string;
    description: string;
    tag: string;
    address: string[];
    abi: any[];
  }) {
    return this.moralis.createStream(options);
  }

  async updateStream(streamId: string, options: any) {
    return this.moralis.updateStream(streamId, options);
  }

  async deleteStream(streamId: string) {
    return this.moralis.deleteStream(streamId);
  }

  async getStreams() {
    return this.moralis.getStreams();
  }

  // Utility methods
  async validateConnection(): Promise<{ alchemy: boolean; moralis: boolean }> {
    const results = { alchemy: false, moralis: false };

    try {
      await this.alchemy.getBlockNumber();
      results.alchemy = true;
    } catch (error) {
      console.error('Alchemy connection failed:', error);
    }

    try {
      await this.moralis.getStreams();
      results.moralis = true;
    } catch (error) {
      console.error('Moralis connection failed:', error);
    }

    return results;
  }

  async getTokenTransfers(contractAddress: string, fromBlock: number, toBlock: number) {
    const params = {
      address: contractAddress,
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer(address,address,uint256)
      ],
    };

    return this.alchemy.getLogs(params);
  }

  async getContractCreationTx(contractAddress: string) {
    const params = {
      address: contractAddress,
      fromBlock: '0x0',
      toBlock: 'latest',
      topics: [],
    };

    const logs = await this.alchemy.getLogs(params);
    return logs.length > 0 ? logs[0] : null;
  }
}

export default BlockchainService;