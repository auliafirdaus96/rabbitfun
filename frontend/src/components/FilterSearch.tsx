import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSearch, type FilterType, type SortType } from "@/contexts/SearchContext";

export const FilterSearch = () => {
  const { searchState, setSearchTerm, setActiveFilter, setSortBy } = useSearch();

  const filters = [
    { id: "all" as FilterType, label: "All Coins" },
    { id: "gainers" as FilterType, label: "📈 Gainers Only" },
    { id: "new" as FilterType, label: "New Launches" },
    { id: "completed" as FilterType, label: "Completed" },
  ];

  const sortOptions = [
    { id: "marketCap" as SortType, label: "💰 Market Cap" },
    { id: "newest" as SortType, label: "🆕 Newest" },
    { id: "priceChange" as SortType, label: "📈 Price Change" },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filterId: FilterType) => {
    setActiveFilter(filterId);
  };

  const handleSortChange = (sortId: SortType) => {
    setSortBy(sortId);
  };

  return (
    <section className="w-full py-6 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-48 h-48 bg-primary/20 rounded-full filter blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-56 h-56 bg-purple-500/20 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by token name or ticker..."
              value={searchState.searchTerm}
              onChange={handleSearchChange}
              className="h-12 pl-10 bg-input border-2 border-primary/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:shadow-neon-sm transition-all"
            />
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
            {/* Filter Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              {filters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={searchState.activeFilter === filter.id ? "default" : "outline"}
                  onClick={() => handleFilterChange(filter.id)}
                  className={
                    searchState.activeFilter === filter.id
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border-2 border-primary text-foreground hover:bg-primary/10 hover:shadow-neon-sm"
                  }
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-2 border-primary text-foreground hover:bg-primary/10 hover:shadow-neon-sm"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Sort: {sortOptions.find(opt => opt.id === searchState.sortBy)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                {sortOptions.map((sort) => (
                  <DropdownMenuItem
                    key={sort.id}
                    onClick={() => handleSortChange(sort.id)}
                    className="cursor-pointer hover:bg-secondary"
                  >
                    {sort.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search Results Info */}
          {searchState.searchTerm && (
            <div className="text-center text-muted-foreground">
              Found {searchState.filteredProjects.length + searchState.filteredFeaturedCoins.length} results for "{searchState.searchTerm}"
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
