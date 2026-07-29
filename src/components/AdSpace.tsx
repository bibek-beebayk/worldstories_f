interface AdSpaceProps {
  size: "banner" | "square" | "rectangle";
  className?: string;
}

const AdSpace = ({ size, className = "" }: AdSpaceProps) => {
  const sizeClasses = {
    banner: "h-24 md:h-32",
    square: "aspect-square",
    rectangle: "aspect-[4/3]"
  };

  return (
    <div className={`bg-ad-bg border border-ad-border rounded-lg flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      <div className="text-center space-y-2 p-4">
        <div className="text-xs font-medium text-muted-foreground">Advertisement</div>
        <div className="text-xs text-muted-foreground/60">
          {size === "banner" ? "728 x 90" : size === "square" ? "300 x 300" : "300 x 250"}
        </div>
      </div>
    </div>
  );
};

export default AdSpace;
