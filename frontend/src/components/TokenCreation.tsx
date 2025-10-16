import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWeb3 } from '@/hooks/useWeb3';
import { Plus, Rocket, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatEther, parseEther } from 'ethers';

interface TokenCreationForm {
  name: string;
  symbol: string;
  metadata: string;
}

export const TokenCreation = () => {
  const [formData, setFormData] = useState<TokenCreationForm>({
    name: '',
    symbol: '',
    metadata: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [txHash, setTxHash] = useState<string>('');

  const { isConnected, createToken, getBNBBalance } = useWeb3();

  const CREATE_FEE = parseEther('0.005'); // 0.005 BNB
  const CREATE_FEE_DISPLAY = formatEther(CREATE_FEE);

  const handleInputChange = (field: keyof TokenCreationForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Token name is required');
    }

    if (!formData.symbol.trim()) {
      errors.push('Token symbol is required');
    }

    if (formData.symbol.length > 10) {
      errors.push('Token symbol should be 10 characters or less');
    }

    if (formData.name.length > 100) {
      errors.push('Token name should be 100 characters or less');
    }

    if (formData.metadata.length > 500) {
      errors.push('Metadata should be 500 characters or less');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    setIsCreating(true);
    setTxHash('');

    try {
      // Check BNB balance before creating
      const balance = await getBNBBalance();
      if (parseFloat(balance) < parseFloat(CREATE_FEE_DISPLAY)) {
        toast.error(`Insufficient BNB balance. You need at least ${CREATE_FEE_DISPLAY} BNB for the creation fee.`);
        return;
      }

      const tx = await createToken(
        formData.name.trim(),
        formData.symbol.trim().toUpperCase(),
        formData.metadata.trim()
      );

      setTxHash(tx.hash);
      toast.success('Token creation transaction submitted!');

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        toast.success('Token created successfully!');

        // Reset form
        setFormData({
          name: '',
          symbol: '',
          metadata: '',
        });
        setTxHash('');
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Error creating token:', error);

      if (error.code === 4001) {
        toast.error('Transaction was rejected by user');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for transaction');
      } else {
        toast.error(error.message || 'Failed to create token');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const getExplorerUrl = (hash: string) => {
    // This should be dynamic based on the current network
    return `https://bscscan.com/tx/${hash}`;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Create New Token
        </CardTitle>
        <CardDescription>
          Create your own ERC20 token on the Ahiru Launchpad platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>
                <strong>Creation Fee:</strong> {CREATE_FEE_DISPLAY} BNB
              </p>
              <p>
                <strong>Total Supply:</strong> 1,000,000,000 tokens (with 18 decimals)
              </p>
              <p>
                <strong>Graduation Requirement:</strong> 1 BNB total sales to create liquidity pool
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {!isConnected ? (
          <Alert>
            <AlertDescription>
              Please connect your wallet to create a token
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Token Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Ahiru Token"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  maxLength={100}
                  disabled={isCreating}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.name.length}/100 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">Token Symbol *</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., AHU"
                  value={formData.symbol}
                  onChange={handleInputChange('symbol')}
                  maxLength={10}
                  disabled={isCreating}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.symbol.length}/10 characters
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata">Metadata URI</Label>
              <Textarea
                id="metadata"
                placeholder="https://example.com/metadata/your-token.json"
                value={formData.metadata}
                onChange={handleInputChange('metadata')}
                maxLength={500}
                disabled={isCreating}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Link to token metadata, image, or additional information
                ({formData.metadata.length}/500 characters)
              </p>
            </div>

            <Button
              type="submit"
              disabled={isCreating || !formData.name.trim() || !formData.symbol.trim()}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Token...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Token ({CREATE_FEE_DISPLAY} BNB)
                </>
              )}
            </Button>
          </form>
        )}

        {txHash && (
          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>Transaction Submitted:</strong>
                </p>
                <a
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {txHash}
                </a>
                <p className="text-xs text-muted-foreground">
                  Click the link above to view on blockchain explorer
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};