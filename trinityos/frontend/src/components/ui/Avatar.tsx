import { initials, avatarColorFor } from "../../lib/format";

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, size = 28, className = "" }: AvatarProps) {
  return (
    <div
      className={`rounded-full text-white flex items-center justify-center font-bold flex-shrink-0 ${avatarColorFor(name)} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38) }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((n, i) => (
        <Avatar key={i} name={n} size={24} className="ring-2 ring-surface-container-lowest" />
      ))}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold flex items-center justify-center ring-2 ring-surface-container-lowest">
          +{overflow}
        </div>
      )}
    </div>
  );
}
