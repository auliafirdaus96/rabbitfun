import React, { useState, useEffect } from 'react';
;
import {
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Code,
  TestTube
} from 'lucide-react';

const InteractiveDemo = () => {
  const [activeDemo, setActiveDemo] = useState('token-creation');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [demoData, setDemoData] = useState({
    tokenName: 'Demo Token',
    tokenSymbol: 'DEMO',
    price: 0.001,
    marketCap: 10000,
    holders: 25,
    volume: 5000
  });

  const demos = [
    {
      id: 'token-creation',
      title: 'Token Creation Process',
      icon: <Zap className="w-6 h-6" />,
      description: 'See how easy it is to create a new token on Rabbit Launchpad',
      steps: [
        { title: 'Connect Wallet', description: 'User connects their Web3 wallet' },
        { title: 'Enter Token Details', description: 'Name, symbol, and description' },
        { title: 'Set Parameters', description: 'Configure bonding curve and fees' },
        { title: 'Deploy Contract', description: 'Smart contract deployed automatically' },
        { title: 'Token Live', description: 'Token is ready for trading!' }
      ]
    },
    {
      id: 'security-features',
      title: 'Security Monitoring',
      icon: <Shield className="w-6 h-6" />,
      description: 'Real-time security scanning and vulnerability detection',
      steps: [
        { title: 'Code Analysis', description: 'Static code analysis running' },
        { title: 'Dependency Check', description: 'Scanning for vulnerable dependencies' },
        { title: 'Security Audit', description: 'Automated security audit in progress' },
        { title: 'Real-time Monitoring', description: 'Continuous security monitoring' },
        { title: 'Security Report', description: 'Comprehensive security report generated' }
      ]
    },
    {
      id: 'performance-testing',
      title: 'Performance Testing',
      icon: <BarChart3 className="w-6 h-6" />,
      description: 'Load testing and performance optimization',
      steps: [
        { title: 'Load Test Setup', description: 'Configuring test parameters' },
        { title: 'Concurrent Users', description: 'Simulating 1000+ users' },
        { title: 'Performance Metrics', description: 'Monitoring response times' },
        { title: 'Stress Testing', description: 'Testing system limits' },
        { title: 'Optimization', description: 'Performance optimization complete' }
      ]
    }
  ];

  const currentDemo = demos.find(d => d.id === activeDemo);

  useEffect(() => {
    if (isPlaying && currentStep < currentDemo?.steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (isPlaying && currentStep >= currentDemo?.steps.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, currentDemo]);

  const startDemo = () => {
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const metrics = [
    { label: 'Response Time', value: '120ms', status: 'excellent', icon: <Zap className="w-4 h-4" /> },
    { label: 'Security Score', value: '92/100', status: 'excellent', icon: <Shield className="w-4 h-4" /> },
    { label: 'Test Coverage', value: '95%', status: 'excellent', icon: <TestTube className="w-4 h-4" /> },
    { label: 'Code Quality', value: 'A+', status: 'excellent', icon: <Code className="w-4 h-4" /> }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-purple-500/30">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Interactive Platform Demo
        </h3>
        <p className="text-gray-300">
          Experience the enterprise features and professional development standards
        </p>
      </div>

      {/* Demo Selection */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {demos.map((demo) => (
          <button
            key={demo.id}
            onClick={() => {
              setActiveDemo(demo.id);
              resetDemo();
            }}
            className={`p-4 rounded-lg border transition-all ${
              activeDemo === demo.id
                ? 'bg-purple-600/20 border-purple-500/50'
                : 'bg-white/5 border-gray-700 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-center mb-2 text-purple-400">
              {demo.icon}
            </div>
            <div className="font-semibold mb-1">{demo.title}</div>
            <div className="text-xs text-gray-400">{demo.description}</div>
          </button>
        ))}
      </div>

      {/* Current Demo Display */}
      <div className="bg-black/50 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-purple-400">{currentDemo?.icon}</div>
            <h4 className="text-lg font-semibold">{currentDemo?.title}</h4>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={isPlaying ? () => setIsPlaying(false) : startDemo}
              className="px-3 py-1 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-1"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="text-sm">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={resetDemo}
              className="px-3 py-1 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-1"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Step {currentStep + 1} of {currentDemo?.steps.length}</span>
            <span>{Math.round(((currentStep + 1) / currentDemo?.steps.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
            />
          </div>
        </div>

        {/* Steps Display */}
        <div className="space-y-3">
          {currentDemo?.steps.map((step, index) => (
            <div
              key={index}
              animate={{
                opacity: index <= currentStep ? 1 : 0.3,
                x: index <= currentStep ? 0 : -20
              }}
              className={`flex items-center space-x-3 p-3 rounded-lg ${
                index === currentStep
                  ? 'bg-purple-600/20 border border-purple-500/50'
                  : index < currentStep
                  ? 'bg-green-600/10 border border-green-500/30'
                  : 'bg-gray-800/50 border border-gray-700'
              }`}
            >
              <div className="flex-shrink-0">
                {index < currentStep ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : index === currentStep ? (
                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">{step.title}</div>
                <div className="text-sm text-gray-400">{step.description}</div>
              </div>
              {index === currentStep && (
                <div
                  className="text-purple-400"
                >
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white/5 rounded-lg p-3 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-gray-400">{metric.icon}</div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                metric.status === 'excellent'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {metric.status}
              </div>
            </div>
            <div className="text-lg font-bold text-white">{metric.value}</div>
            <div className="text-xs text-gray-400">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Demo Info */}
      <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-blue-400 mb-1">Live Demo Platform</div>
            <div className="text-sm text-gray-300">
              This is a simulated demonstration of the platform's capabilities.
              The actual platform includes real-time trading, live blockchain integration,
              and comprehensive security monitoring.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveDemo;