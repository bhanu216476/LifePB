import React from 'react';

interface SparklineProps {
  value: number; // 0 to 100
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  height?: number; // height in pixels
}

const Sparkline: React.FC<SparklineProps> = ({ value, type = 'primary', height = 6 }) => {
  const percentage = Math.min(100, Math.max(0, value));

  const getColorClass = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-emerald-500 to-green-400';
      case 'danger':
        return 'bg-gradient-to-r from-rose-500 to-red-400';
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 to-yellow-400';
      case 'accent':
        return 'bg-gradient-to-r from-[#06B6D4] to-cyan-400';
      case 'primary':
      default:
        return 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]';
    }
  };

  return (
    <div className="w-full bg-white/5 rounded-full overflow-hidden border border-white/5" style={{ height: `${height}px` }}>
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${getColorClass()}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default Sparkline;
