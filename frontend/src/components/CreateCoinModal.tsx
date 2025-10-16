import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Wallet, Upload, X, AlertCircle, Link, ChevronDown, Zap } from "lucide-react";
import { TokenService, type TokenData } from "@/utils/token";
import { WalletService } from "@/services/walletService";
import { sanitizeInput, sanitizeTokenName, sanitizeTokenSymbol, sanitizeDescription, sanitizeUrl, sanitizeTokenData, containsSuspiciousPatterns } from "@/utils/sanitize";
import { TokenCreationErrorBoundary } from "@/components/ErrorBoundary";

interface CreateCoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onConnectWallet: () => void;
}

export const CreateCoinModal = ({ isOpen, onClose, isConnected, onConnectWallet }: CreateCoinModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    imageUrl: "",
    telegram: "",
    twitter: "",
    tiktok: "",
    website: "",
    discord: "",
    instagram: ""
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState({
    name: 'Unknown',
    chainId: 0
  });
    const [isSocialLinksExpanded, setIsSocialLinksExpanded] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

  // Creator Buy Options
  const [creatorBuyOptions, setCreatorBuyOptions] = useState({
    amount: '0.1', // BNB amount default
  });

  // Social media platforms for dropdown
  const socialPlatforms = [
    { value: 'telegram', label: 'Telegram', placeholder: 'https://t.me/yourchannel' },
    { value: 'twitter', label: 'Twitter', placeholder: 'https://twitter.com/yourhandle' },
    { value: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
    { value: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
    { value: 'discord', label: 'Discord', placeholder: 'https://discord.gg/yourserver' },
    { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' }
  ];

  // Force refresh network info when component mounts and every time modal opens
  useEffect(() => {
    const updateNetworkInfo = async () => {
      if (window.ethereum && isConnected) {
        try {
          // Force refresh by requesting latest state
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const chainIdNumber = parseInt(chainId, 16);

            console.log('Debug - Raw chainId from MetaMask:', chainId);
            console.log('Debug - Parsed chainId number:', chainIdNumber);
            console.log('Debug - Connected accounts:', accounts);

            let networkName = 'Unknown';
            if (chainIdNumber === 97) networkName = 'BSC Testnet';
            else if (chainIdNumber === 56) networkName = 'BSC Mainnet';
            else if (chainIdNumber === 1) networkName = 'Ethereum Mainnet';
            else networkName = `Chain ID: ${chainIdNumber}`;

            console.log('Debug - Detected network:', networkName);
            setCurrentNetwork({ name: networkName, chainId: chainIdNumber });
          }
        } catch (error) {
          console.error('Error getting network info:', error);
        }
      }
    };

    // Update immediately when modal opens or connection changes
    updateNetworkInfo();

    // Update multiple times to ensure we get latest data
    const intervals = [
      setTimeout(updateNetworkInfo, 500),
      setTimeout(updateNetworkInfo, 1000),
      setTimeout(updateNetworkInfo, 2000)
    ];

    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        console.log('Debug - chainChanged event detected');
        updateNetworkInfo();
      });

      window.ethereum.on('accountsChanged', () => {
        console.log('Debug - accountsChanged event detected');
        updateNetworkInfo();
      });
    }

    return () => {
      intervals.forEach(clearTimeout);
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', updateNetworkInfo);
        window.ethereum.removeListener('accountsChanged', updateNetworkInfo);
      }
    };
  }, [isConnected, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Check for suspicious patterns before processing
    if (containsSuspiciousPatterns(value)) {
      console.warn(`Suspicious input detected in ${name}:`, value);
      setCreationError("Invalid input detected. Please remove any suspicious characters or scripts.");
      return;
    }

    let sanitizedValue = value;

    // Apply specific sanitization based on field type
    switch (name) {
      case 'name':
        sanitizedValue = sanitizeTokenName(value);
        break;
      case 'symbol':
        sanitizedValue = sanitizeTokenSymbol(value);
        break;
      case 'description':
        sanitizedValue = sanitizeDescription(value);
        break;
      case 'website':
      case 'twitter':
      case 'telegram':
      case 'tiktok':
      case 'discord':
      case 'instagram':
        sanitizedValue = sanitizeUrl(value);
        break;
      default:
        sanitizedValue = sanitizeInput(value);
    }

    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleCreatorBuyChange = (field: string, value: string) => {
    setCreatorBuyOptions(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Get platform validation rules
  const getPlatformValidation = (platform: string, value: string) => {
    const validations: Record<string, { pattern: RegExp; message: string }> = {
      telegram: { pattern: /^https:\/\/t\.me\//, message: "Must start with https://t.me/" },
      twitter: { pattern: /^https:\/\/(twitter\.com|x\.com)\//, message: "Must start with https://twitter.com/ or https://x.com/" },
      tiktok: { pattern: /^https:\/\/(tiktok\.com|www\.tiktok\.com)\//, message: "Must start with https://tiktok.com/" },
      website: { pattern: /^https:\/\//, message: "Must start with https://" },
      discord: { pattern: /^https:\/\/discord\.gg\//, message: "Must start with https://discord.gg/" },
      instagram: { pattern: /^https:\/\/(instagram\.com|www\.instagram\.com)\//, message: "Must start with https://instagram.com/" }
    };
    const validation = validations[platform];
    if (validation && value && !validation.pattern.test(value)) {
      return validation.message;
    }
    return null;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      description: "",
      imageUrl: "",
      telegram: "",
      twitter: "",
      tiktok: "",
      website: "",
      discord: "",
      instagram: ""
    });
    setCreatorBuyOptions({
      amount: '0.1',
    });
    setImagePreview(null);
    setCreateProgress(0);
    setCreationError(null);
  };

  const handleCreateToken = async () => {
    console.log("🔥 DEBUG - handleCreateToken called!");
    console.log("🔥 DEBUG - isConnected:", isConnected);
    console.log("🔥 DEBUG - isCreating:", isCreating);
    console.log("🔥 DEBUG - formData:", formData);

    if (!isConnected) {
      console.log("🔥 DEBUG - Wallet not connected, calling onConnectWallet");
      onConnectWallet();
      return;
    }

    setCreationError(null);
    console.log("Debug - Starting token creation process");

    setIsCreating(true);
    setCreateProgress(0);

    try {
      // Initialize wallet service
      const walletService = WalletService.getInstance();

      // Check if MetaMask is installed
      if (!walletService.isMetaMaskInstalled()) {
        setCreationError("MetaMask is not installed. Please install MetaMask to continue.");
        setIsCreating(false);
        setCreateProgress(0);
        return;
      }

      // Connect to MetaMask and get wallet info
      console.log("Debug - Connecting to wallet...");
      const walletInfo = await walletService.connectWallet();
      console.log("Debug - Wallet info result:", walletInfo);

      // Check if user is on BSC Testnet, if not, show error with instructions
      if (walletInfo.chainId !== 97) {
        const networkName = walletInfo.networkName;

        setCreationError(
          `⚠️ You're on ${networkName} (Chain ID: ${walletInfo.chainId}).\n\n` +
          `For testing, please switch to BSC Testnet:\n` +
          `1. Click MetaMask extension\n` +
          `2. Click network dropdown\n` +
          `3. Select "BSC Testnet" or "Add Network"\n` +
          `4. Chain ID: 97\n\n` +
          `This is a TESTNET environment for testing purposes only.`
        );
        setIsCreating(false);
        setCreateProgress(0);
        return;
      }

      // Prepare data for validation with real wallet address
      const dataForValidation = {
        ...formData,
        creator: walletInfo.address,
      };

      console.log("Debug - dataForValidation with real address:", dataForValidation);
      const validation = TokenService.validateTokenData(dataForValidation);
      console.log("Debug - validation result:", validation);

      if (!validation.isValid) {
        console.log("Debug - Validation failed, errors:", validation.errors);
        setCreationError(validation.errors.join(", "));
        setIsCreating(false);
        setCreateProgress(0);
        return;
      }

      // Show gas cost estimation
      const estimatedGas = TokenService.getEstimatedGasCost();

      // Show real MetaMask confirmation via transaction
      const tokenData: TokenData = {
        ...formData,
        creator: walletInfo.address,
      };

      // Simulate progress updates
      const updateProgress = (progress: number) => {
        setCreateProgress(progress);
      };

      // Create token using TokenService
      console.log("Debug - Starting token creation process...");
      const result = await TokenService.createToken(tokenData, updateProgress);
      console.log("Debug - TokenService result:", result);

      if (result.success && result.contractAddress) {
        console.log("Debug - Token creation successful, adding to backend...");

        // Add token to backend
        try {
          // Sanitize all data before sending to backend
          const sanitizedTokenData = sanitizeTokenData({
            name: formData.name,
            symbol: formData.symbol,
            description: formData.description,
            website: formData.website,
            twitter: formData.twitter,
            telegram: formData.telegram
          });

          const tokenData = {
            name: sanitizedTokenData.name,
            symbol: sanitizedTokenData.symbol,
            description: sanitizedTokenData.description,
            creatorAddress: walletInfo.address, // Use real wallet address
            imageUrl: formData.imageUrl || `https://via.placeholder.com/96/4F46E5/FFFFFF?text=${sanitizedTokenData.symbol}`,
            website: sanitizedTokenData.website,
            twitter: sanitizedTokenData.twitter,
            telegram: sanitizedTokenData.telegram
          };

          console.log("Debug - Sending to backend:", tokenData);

          const backendResponse = await fetch('http://localhost:3001/api/tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(tokenData),
          });

          console.log("Debug - Backend response status:", backendResponse.status);

          if (backendResponse.ok) {
            const responseData = await backendResponse.json();
            console.log("Debug - Backend response data:", responseData);
            console.log("Token added to backend successfully");
          } else {
            const errorText = await backendResponse.text();
            console.error("Backend error response:", errorText);
          }
        } catch (error) {
          console.error("Failed to add token to backend:", error);
        }

        // Success - show success message with real transaction details
        const successMessage = `🎉 Token "${formData.name}" (${formData.symbol}) created successfully!\n\n📄 Contract Address: ${result.contractAddress}\n🔗 Transaction Hash: ${result.txHash}\n💰 Actual Transfer: 0.001 tBNB (burned)\n⛽ Real Gas Fee: Deducted from wallet\n\n📊 Note: This was a real transaction on BSC Testnet.\nGas fees were actually deducted from your wallet.\n\nYour token will appear on the main page after refresh.`;

        console.log("Debug - Showing success message");
        if (confirm(successMessage + "\n\nView this real transaction on BSC Testnet Explorer?")) {
          window.open(`https://testnet.bscscan.com/tx/${result.txHash}`, '_blank');
        }

        // Close modal and reset form
        console.log("Debug - Closing modal and resetting form");
        onClose();
        resetForm();

        // Trigger a page refresh to show the new token
        console.log("Debug - Scheduling page refresh");
        setTimeout(() => {
          console.log("Debug - Executing page refresh");
          window.location.reload();
        }, 1000); // Increased delay to 1 second
      } else {
        console.log("Debug - Token creation failed:", result);
        setCreationError(result.error || "Failed to create token");
      }
    } catch (error) {
      console.error("Error creating token:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      setCreationError(`An unexpected error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
      setCreateProgress(0);
    }
  };

  
  const handleClose = () => {
    if (!isCreating) {
      onClose();
      resetForm();
    }
  };

  return (
    <TokenCreationErrorBoundary>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">Create New Token</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!isConnected && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-500">
                  <Wallet className="h-5 w-5" />
                  <span className="font-medium">Connect your wallet to create a token</span>
                </div>
              </div>
            )}


            {creationError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm text-text-light mt-1 whitespace-pre-line">
                  {creationError}
                </p>
              </div>
            )}

            {/* Token Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Token Image</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Token preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData(prev => ({ ...prev, imageUrl: "" }));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted">
                    <Upload className="h-6 w-6 text-text-light" />
                  </div>
                )}
                <div>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('imageUrl')?.click()}
                    disabled={isCreating}
                  >
                    Upload Image
                  </Button>
                  <p className="text-xs text-text-light mt-1">
                    Recommended: 512x512px, PNG or JPG
                  </p>
                </div>
              </div>
            </div>

            {/* Token Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Moon Rabbit"
                value={formData.name}
                onChange={handleInputChange}
                maxLength={50}
                disabled={isCreating}
              />
              <div className="text-xs text-text-light flex justify-between">
                <span>2-50 characters required</span>
                <span>{formData.name.length}/50</span>
              </div>
            </div>

            {/* Token Symbol */}
            <div className="space-y-2">
              <Label htmlFor="symbol">Token Symbol *</Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="e.g., MRAB"
                value={formData.symbol}
                onChange={handleInputChange}
                maxLength={10}
                className="uppercase"
                disabled={isCreating}
              />
              <div className="text-xs text-text-light flex justify-between">
                <span>2-10 letters, uppercase</span>
                <span>{formData.symbol.length}/10</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your token and its purpose..."
                value={formData.description}
                onChange={handleInputChange}
                maxLength={500}
                rows={4}
                disabled={isCreating}
              />
              <div className="text-xs text-text-light flex justify-between">
                <span>10-500 characters required</span>
                <span>{formData.description.length}/500</span>
              </div>
            </div>

            {/* Initial Buy - Like Token Name Style */}
            <div className="space-y-2">
              <Label htmlFor="initialBuy">Initial Buy (Optional)</Label>
              <Input
                id="initialBuy"
                type="number"
                name="initialBuy"
                placeholder="0.1"
                value={creatorBuyOptions.amount}
                onChange={(e) => handleCreatorBuyChange('amount', e.target.value)}
                min="0.001"
                step="0.001"
                disabled={isCreating}
              />
              <div className="text-xs text-text-light flex justify-between">
                <span>Buy tokens immediately after creation (optional)</span>
                <span>{creatorBuyOptions.amount ? `${creatorBuyOptions.amount} BNB` : '0 BNB'}</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              {/* Header with Link icon and Chevron toggle */}
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors p-2 rounded-lg"
                onClick={() => setIsSocialLinksExpanded(!isSocialLinksExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Social Links (Optional)</h3>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isSocialLinksExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {/* Collapsible content */}
              {isSocialLinksExpanded && (
                <div className="space-y-4">
                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-32 px-3 py-2 text-sm border border-border rounded-md bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">Website</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://yourwebsite.com"
                        disabled={isCreating}
                        className={getPlatformValidation('website', formData.website) ? 'border-red-500' : ''}
                      />
                      {getPlatformValidation('website', formData.website) && (
                        <p className="text-xs text-red-500 mt-1">{getPlatformValidation('website', formData.website)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-32 px-3 py-2 text-sm border border-border rounded-md bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">Twitter</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        name="twitter"
                        value={formData.twitter}
                        onChange={handleInputChange}
                        placeholder="https://twitter.com/yourhandle"
                        disabled={isCreating}
                        className={getPlatformValidation('twitter', formData.twitter) ? 'border-red-500' : ''}
                      />
                      {getPlatformValidation('twitter', formData.twitter) && (
                        <p className="text-xs text-red-500 mt-1">{getPlatformValidation('twitter', formData.twitter)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-32 px-3 py-2 text-sm border border-border rounded-md bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">Telegram</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        name="telegram"
                        value={formData.telegram}
                        onChange={handleInputChange}
                        placeholder="https://t.me/yourchannel"
                        disabled={isCreating}
                        className={getPlatformValidation('telegram', formData.telegram) ? 'border-red-500' : ''}
                      />
                      {getPlatformValidation('telegram', formData.telegram) && (
                        <p className="text-xs text-red-500 mt-1">{getPlatformValidation('telegram', formData.telegram)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-32 px-3 py-2 text-sm border border-border rounded-md bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">TikTok</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        name="tiktok"
                        value={formData.tiktok}
                        onChange={handleInputChange}
                        placeholder="https://tiktok.com/@yourhandle"
                        disabled={isCreating}
                        className={getPlatformValidation('tiktok', formData.tiktok) ? 'border-red-500' : ''}
                      />
                      {getPlatformValidation('tiktok', formData.tiktok) && (
                        <p className="text-xs text-red-500 mt-1">{getPlatformValidation('tiktok', formData.tiktok)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-32 px-3 py-2 text-sm border border-border rounded-md bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">Instagram</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        name="instagram"
                        value={formData.instagram}
                        onChange={handleInputChange}
                        placeholder="https://instagram.com/yourhandle"
                        disabled={isCreating}
                        className={getPlatformValidation('instagram', formData.instagram) ? 'border-red-500' : ''}
                      />
                      {getPlatformValidation('instagram', formData.instagram) && (
                        <p className="text-xs text-red-500 mt-1">{getPlatformValidation('instagram', formData.instagram)}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Token Card */}
            {showPreview && formData.name && formData.symbol && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Preview Token Card</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                    disabled={isCreating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="bg-gradient-to-br from-card to-muted border border-border rounded-xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt={formData.symbol}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-primary-foreground">
                            {formData.symbol?.substring(0, 2) || 'TK'}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground">{formData.name || 'Token Name'}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-primary">$0.00000</span>
                          <span className="text-sm text-green-400">+0.00%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">MC $0</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">Vol $0</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-input rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                        style={{ width: '0%' }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground">0%</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-muted-foreground">0 BNB in bonding curve</span>
                    <span className="text-xs text-muted-foreground">• 35 BNB to graduate</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                      Trade
                    </Button>
                    <Button size="sm" variant="outline" className="p-2">
                      <span className="text-xl">❤️</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isCreating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Creating Token...</span>
                  <span>{createProgress}%</span>
                </div>
                <Progress
                  value={createProgress}
                  className="h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-neon-glow"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowPreview(!showPreview)}
                disabled={isCreating || !formData.name || !formData.symbol}
                className="flex-1 sm:flex-none"
              >
                {showPreview ? "Hide Preview" : "Preview"}
              </Button>
            </div>
            <Button
              onClick={handleCreateToken}
              disabled={isCreating || !isConnected}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
            >
              {!isConnected ? "Connect Wallet First" :
               isCreating ? "Creating..." : "Create Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TokenCreationErrorBoundary>
  );
};