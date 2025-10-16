import { useState, useEffect } from "react";
import { TrendingUp, Users, Coins, Activity, DollarSign, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedProgress } from "./AnimatedProgress";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "success" | "warning";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = ({ title, value, subtitle, icon, color, trend }: StatCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      const targetValue = parseFloat(value.replace(/[^0-9.]/g, ''));
      const duration = 2000;
      const steps = 60;
      const increment = targetValue / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= targetValue) {
          current = targetValue;
          clearInterval(timer);
        }
        setDisplayValue(current);
      }, duration / steps);

      return () => clearInterval(timer);
    }, 100);

    return () => clearTimeout(timer);
  }, [value]);

  const formatValue = (val: number, format: string) => {
    if (format.includes('K')) {
      return `${val.toFixed(0)}K`;
    } else if (format.includes('M')) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (format.includes('BNB')) {
      return `${val.toFixed(2)} BNB`;
    }
    return val.toFixed(0);
  };

  const getColorClasses = (colorType: string) => {
    switch (colorType) {
      case "primary":
        return "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/20 text-primary";
      case "secondary":
        return "bg-gradient-to-br from-purple-500/20 to-purple-500/10 border-purple-500/20 text-purple-500";
      case "success":
        return "bg-gradient-to-br from-green-500/20 to-green-500/10 border-green-500/20 text-green-500";
      case "warning":
        return "bg-gradient-to-br from-orange-500/20 to-orange-500/10 border-orange-500/20 text-orange-500";
      default:
        return "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/20 text-primary";
    }
  };

  return (
    <Card className={`relative overflow-hidden border-2 ${getColorClasses(color)} hover:shadow-lg hover:shadow-primary/10 transition-all duration-300`}>
      <CardContent className="p-6">
        {/* Gradient Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
              {icon}
            </div>
            {trend && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                trend.isPositive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
              }`}>
                <TrendingUp className={`h-3 w-3 ${!trend.isPositive ? 'rotate-180' : ''}`} />
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-text-light">{title}</p>
            <p className="text-2xl font-bold text-foreground">
              {formatValue(displayValue, value)}
            </p>
            <p className="text-xs text-text-light">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PlatformStats = () => {
  const [stats, setStats] = useState([
    {
      title: "Total Tokens Created",
      value: "1.2K",
      subtitle: "+120 this week",
      icon: <Coins className="h-6 w-6" />,
      color: "primary" as const,
      trend: { value: 12.5, isPositive: true }
    },
    {
      title: "Active Users",
      value: "45K",
      subtitle: "+5.2K this week",
      icon: <Users className="h-6 w-6" />,
      color: "success" as const,
      trend: { value: 8.3, isPositive: true }
    },
    {
      title: "Total Volume",
      value: "2.5M",
      subtitle: "All time volume",
      icon: <DollarSign className="h-6 w-6" />,
      color: "secondary" as const,
      trend: { value: 15.7, isPositive: true }
    },
    {
      title: "Graduated Tokens",
      value: "150",
      subtitle: "+12 this month",
      icon: <Rocket className="h-6 w-6" />,
      color: "warning" as const,
      trend: { value: 6.2, isPositive: true }
    }
  ]);

  return (
    <section className="w-full py-16 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="space-y-8">
          {/* Section Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              📊 Platform Statistics
            </h2>
            <p className="text-lg md:text-xl text-text-light max-w-3xl mx-auto">
              Real-time metrics and performance indicators for Rabbit Launchpad ecosystem
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="transform transition-all duration-300 hover:scale-105"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                <StatCard {...stat} />
              </div>
            ))}
          </div>

          {/* Platform Health */}
          <div className="mt-12">
            <Card className="bg-card border-border/50 overflow-hidden">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">Platform Health Score</h3>
                    <p className="text-text-light">Overall system performance and user satisfaction</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AnimatedProgress
                      value={92}
                      label="System Performance"
                      description="Uptime and response times"
                      color="success"
                      showPercentage={true}
                    />

                    <AnimatedProgress
                      value={88}
                      label="User Satisfaction"
                      description="Based on user feedback"
                      color="primary"
                      showPercentage={true}
                    />

                    <AnimatedProgress
                      value={95}
                      label="Security Score"
                      description="Security audit results"
                      color="success"
                      showPercentage={true}
                    />

                    <AnimatedProgress
                      value={78}
                      label="Community Growth"
                      description="Monthly active users"
                      color="warning"
                      showPercentage={true}
                    />
                  </div>

                  <div className="text-center pt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-500 rounded-full border border-green-500/20">
                      <Activity className="h-4 w-4" />
                      <span className="font-semibold">All Systems Operational</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};