import { X, Send, Globe } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full border-t border-black bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden py-6 sm:py-8 pb-8 sm:pb-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-5 w-24 h-24 sm:top-20 sm:left-10 sm:w-48 sm:h-48 bg-primary/10 sm:bg-primary/20 rounded-full filter blur-xl sm:blur-2xl animate-pulse"></div>
        <div className="absolute bottom-10 right-5 w-28 h-28 sm:bottom-20 sm:right-10 sm:w-56 sm:h-56 bg-purple-500/10 sm:bg-purple-500/20 rounded-full filter blur-xl sm:blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Footer Content - 3 Section Layout */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-4">
          {/* Left: RabbitFun Branding */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg sm:text-xl font-bold">R</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                RabbitFun
              </h3>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Born to Hop, Built to Dominate
            </p>
          </div>

          {/* Center: Copyright */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              © {currentYear} RabbitFun. All rights reserved.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-xs text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">
                Terms of Service
              </a>
              <span className="hidden md:inline">•</span>
              <a href="#" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <span className="hidden md:inline">•</span>
              <a href="#" className="hover:text-primary transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>

          {/* Right: Social Media Logos */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="https://twitter.com/RabbitFun"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center touch-manipulation"
            >
              <X className="h-4 w-4 sm:h-4 sm:w-4 text-primary hover:text-primary/80 transition-colors" />
            </a>
            <a
              href="https://t.me/rabbitfun"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center touch-manipulation"
            >
              <Send className="h-4 w-4 sm:h-4 sm:w-4 text-primary hover:text-primary/80 transition-colors" />
            </a>
            <a
              href="#"
              className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center touch-manipulation"
            >
              <Globe className="h-4 w-4 sm:h-4 sm:w-4 text-primary hover:text-primary/80 transition-colors" />
            </a>
          </div>
        </div>

        {/* Bottom Gradient Border */}
        <div className="mt-4 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full opacity-50"></div>
      </div>
    </footer>
  );
};
