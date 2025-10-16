import { useState } from "react";
import { ExternalLink, User, Verified } from "lucide-react";

interface CreatorLinkProps {
  creatorId?: string;
  creatorName?: string;
  isPlatformCreator?: boolean;
  className?: string;
}

export const CreatorLink = ({
  creatorId,
  creatorName = "Anonymous Creator",
  isPlatformCreator = false,
  className = ""
}: CreatorLinkProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlatformCreator) {
      // Navigate to platform creator profile
      console.log('Navigate to platform creator profile');
      // window.location.href = `/creator/${creatorId}`;
    } else {
      // Navigate to external creator profile or wallet
      console.log('Navigate to external creator:', creatorName);
      // window.open(`https://bscscan.com/address/${creatorId}`, '_blank');
    }
  };

  const getCreatorDisplay = () => {
    if (isPlatformCreator) {
      return (
        <div className="flex items-center gap-1">
          <Verified className="h-3 w-3 text-blue-400" />
          <span>{creatorName}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <User className="h-3 w-3 text-gray-400" />
        <span>{creatorName}</span>
      </div>
    );
  };

  return (
    <button
      onClick={handleCreatorClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors cursor-pointer ${className}`}
    >
      {getCreatorDisplay()}
      {isHovered && (
        <ExternalLink className="h-2.5 w-2.5" />
      )}
    </button>
  );
};