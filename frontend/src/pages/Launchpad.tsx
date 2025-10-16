import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletConnect } from '@/components/WalletConnect';
import { TokenCreation } from '@/components/TokenCreation';
import { TokenList } from '@/components/TokenList';
import { Footer } from '@/components/Footer';
import { Rocket, Plus, TrendingUp, Wallet, TestTube } from 'lucide-react';

const Launchpad = () => {
  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Rocket className="h-10 w-10 text-primary" />
            RabbitFun Launchpad
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create and trade tokens on the bonding curve. Once tokens reach 1 BNB in total sales,
            they graduate to a DEX with liquidity pools.
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="flex justify-center">
          <WalletConnect />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="trade" className="w-full max-w-6xl mx-auto">
          <TabsList className={`grid w-full ${process.env.NODE_ENV === 'development' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="trade" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trade Tokens
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Token
            </TabsTrigger>
            {process.env.NODE_ENV === 'development' && (
              <TabsTrigger value="testing" className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Testing
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="trade" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trading Dashboard</CardTitle>
                <CardDescription>
                  Buy and sell tokens on the bonding curve before they graduate to DEX
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TokenList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Creation</CardTitle>
                <CardDescription>
                  Create your own ERC20 token with a bonding curve mechanism
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TokenCreation />
              </CardContent>
            </Card>
          </TabsContent>

          {process.env.NODE_ENV === 'development' && (
            <TabsContent value="testing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Testing Tools</CardTitle>
                  <CardDescription>
                    Development testing utilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Testing panel has been removed during code cleanup.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Fair Launch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Every token starts with a bonding curve, ensuring fair price discovery for early adopters.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Graduation System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tokens automatically graduate to DEX when they reach 1 BNB in total sales.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Low Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Only 1.25% total trading fees (1% platform, 0.25% creator rewards).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Launchpad;