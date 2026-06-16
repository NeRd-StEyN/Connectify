import "./Skeleton.css";

export const Skeleton = ({ width, height, borderRadius = "8px", style, className = "" }) => {
  return (
    <div
      className={`skeleton-base ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
};

export const SkeletonCircle = ({ size, style, className = "" }) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius="50%"
      style={style}
      className={className}
    />
  );
};
