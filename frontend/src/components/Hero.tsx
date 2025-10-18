export const Hero = () => {
  return (
    <section data-testid="hero-section" className="relative w-full py-8 md:py-12 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Animated Background Elements - Responsive */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-5 w-24 h-24 sm:top-20 sm:left-10 sm:w-48 sm:h-48 bg-primary/10 sm:bg-primary/20 rounded-full filter blur-xl sm:blur-2xl animate-pulse"></div>
        <div className="absolute bottom-10 right-5 w-28 h-28 sm:bottom-20 sm:right-10 sm:w-56 sm:h-56 bg-purple-500/10 sm:bg-purple-500/20 rounded-full filter blur-xl sm:blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Title + Slogan - All Screen Sizes */}
          <div className="relative w-full max-w-md md:max-w-2xl lg:max-w-4xl flex flex-col items-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tighter leading-tight">
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient bg-300 animate-gradient-x">
                RabbitFun
              </span>
            </h1>

            {/* Tagline - Centered Below Title */}
            <div className="w-full max-w-sm md:max-w-2xl flex justify-center">
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground font-medium leading-tight">
                <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  Born to Hop, Built to Dominate
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};