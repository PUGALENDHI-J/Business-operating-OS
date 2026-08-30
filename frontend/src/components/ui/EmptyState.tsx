import { Icon } from "./Icon";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center text-center ${compact ? "p-6" : "p-8"}`}>
      <div className={`bg-surface-container-high rounded-full flex items-center justify-center mb-4 ${compact ? "w-16 h-16" : "w-24 h-24 mb-6"}`}>
        <Icon name={icon} className="text-outline" size={compact ? 28 : 48} />
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h3>
      <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" icon={<Icon name="add" size={18} />} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
