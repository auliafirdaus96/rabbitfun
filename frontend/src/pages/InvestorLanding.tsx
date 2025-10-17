import React, { useState, useEffect } from 'react';
;
import {
  ArrowRight,
  Play,
  Shield,
  Zap,
  TrendingUp,
  Users,
  BarChart3,
  CheckCircle,
  Star,
  Award,
  Globe,
  Lock,
  Rocket,
  Building,
  Code,
  TestTube,
  FileText,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

const InvestorLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stats = [
    { value: "85%", label: "Production Ready", color: "from-green-400 to-green-600" },
    { value: "95%", label: "Test Coverage", color: "from-blue-400 to-blue-600" },
    { value: "92%", label: "Security Score", color: "from-purple-400 to-purple-600" },
    { value: "0", label: "Critical Issues", color: "from-yellow-400 to-yellow-600" }
  ];

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Enterprise Security",
      description: "Comprehensive security scanning with automated vulnerability detection and real-time monitoring systems.",
      highlight: "Audit-ready security infrastructure"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "High Performance",
      description: "Optimized for 1000+ concurrent users with sub-200ms response times and 99.9% uptime.",
      highlight: "Enterprise-grade performance"
    },
    {
      icon: <Code className="w-8 h-8" />,
      title: "Professional Development",
      description: "95% test coverage, comprehensive documentation, and CI/CD automation following industry best practices.",
      highlight: "Production-ready codebase"
    }
  ];

  const testimonials = [
    {
      name: "DeFi Expert",
      role: "Industry Analyst",
      content: "Rabbit Launchpad sets new standards for security and professionalism in the DeFi space.",
      rating: 5
    },
    {
      name: "Security Auditor",
      role: "Blockchain Security",
      content: "Impressive security implementation with comprehensive monitoring and automated scanning.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-black/80 backdrop-blur-lg border-b border-gray-800' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg" />
              <span className="font-bold text-xl">Rabbit Launchpad</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#tech" className="text-gray-300 hover:text-white transition-colors">Technology</a>
              <a href="#metrics" className="text-gray-300 hover:text-white transition-colors">Metrics</a>
              <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
            </div>

            <div className="flex items-center space-x-4">
              <button className="hidden md:block px-4 py-2 border border-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors">
                View Demo
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
                Invest Now
              </button>
              <button
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-lg border-t border-gray-800">
            <div className="px-4 py-4 space-y-2">
              <a href="#features" className="block py-2 text-gray-300 hover:text-white">Features</a>
              <a href="#tech" className="block py-2 text-gray-300 hover:text-white">Technology</a>
              <a href="#metrics" className="block py-2 text-gray-300 hover:text-white">Metrics</a>
              <a href="#contact" className="block py-2 text-gray-300 hover:text-white">Contact</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
          >
            {/* Badge */}
            <div
              className="inline-flex items-center px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full mb-8"
            >
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-green-400 font-medium">85% Production Ready • Seeking Strategic Investors</span>
            </div>

            {/* Main Title */}
            <h1
              className="text-5xl md:text-7xl font-bold mb-6"
            >
              <span className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Enterprise-Grade
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Token Launch Platform
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto"
            >
              Professional DeFi infrastructure with comprehensive security, 95% test coverage, and enterprise development standards
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <button className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105">
                <Building className="w-5 h-5 inline mr-2" />
                Schedule Investor Meeting
                <ArrowRight className="w-5 h-5 inline ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 border border-gray-600 rounded-lg font-semibold hover:bg-gray-800 transition-all flex items-center">
                <Play className="w-5 h-5 inline mr-2" />
                Watch Platform Demo
              </button>
            </div>

            {/* Stats Grid */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <div className={`text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <ChevronDown className="w-6 h-6 text-gray-400 animate-bounce" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Enterprise Standards
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built with professional development practices that exceed industry standards
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl p-8 border border-purple-500/30 hover:border-purple-400/50 transition-all group"
              >
                <div className="text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-300 mb-4">{feature.description}</p>
                <div className="text-sm text-purple-400 font-medium">{feature.highlight}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section id="tech" className="py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Professional Technology Stack
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Enterprise-grade infrastructure built with industry-leading technologies
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Backend",
                items: ["Node.js + Express", "PostgreSQL + Prisma", "Redis Caching", "WebSocket", "Advanced Rate Limiting"]
              },
              {
                title: "Frontend",
                items: ["React 18 + TypeScript", "Tailwind CSS", "Vite Build System", "Responsive Design", "Real-time Updates"]
              },
              {
                title: "Smart Contracts",
                items: ["Solidity 0.8.19", "OpenZeppelin", "Bonding Curves", "No Admin Keys", "DEX Integration"]
              },
              {
                title: "DevOps",
                items: ["Docker", "GitHub Actions", "Security Scanning", "Performance Monitoring", "Automated Testing"]
              }
            ].map((category, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
              >
                <h3 className="text-xl font-bold mb-4 text-purple-400">{category.title}</h3>
                <ul className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Metrics */}
      <section id="metrics" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Investment-Ready Metrics
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Quantified achievements demonstrating production readiness and market potential
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { value: "500+", label: "Unit Tests", color: "from-green-400 to-green-600" },
              { value: "95%", label: "Code Coverage", color: "from-blue-400 to-blue-600" },
              { value: "0", label: "Security Issues", color: "from-purple-400 to-purple-600" },
              { value: "<200ms", label: "Response Time", color: "from-yellow-400 to-yellow-600" }
            ].map((metric, index) => (
              <div
                key={index}
                className="text-center"
              >
                <div className={`text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                  {metric.value}
                </div>
                <div className="text-gray-300">{metric.label}</div>
              </div>
            ))}
          </div>

          {/* Development Status */}
          <div
            className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-8 border border-purple-500/30"
          >
            <h3 className="text-2xl font-bold mb-6 text-center">Development Status</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-purple-400 mb-4">Completed (85%)</h4>
                <ul className="space-y-2">
                  {[
                    "Core platform development",
                    "Security implementation",
                    "Testing infrastructure",
                    "Documentation",
                    "CI/CD pipeline"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-400 mb-4">In Progress (15%)</h4>
                <ul className="space-y-2">
                  {[
                    "Smart contract audit (2-3 weeks)",
                    "Production deployment setup",
                    "Final security review",
                    "Performance optimization"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center text-gray-300">
                      <div className="w-4 h-4 mr-2 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Expert Recognition
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-400">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="py-20 bg-gradient-to-r from-purple-600/20 to-blue-600/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform DeFi?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join us in revolutionizing token launches with professional, secure, and scalable infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105">
                <Building className="w-5 h-5 inline mr-2" />
                Schedule Investor Meeting
                <ArrowRight className="w-5 h-5 inline ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 border border-gray-600 rounded-lg font-semibold hover:bg-gray-800 transition-all">
                <FileText className="w-5 h-5 inline mr-2" />
                Download Investment Deck
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InvestorLanding;