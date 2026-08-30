import { ContactActions } from "../ui/ContactActions";
import { Button } from "../ui/Button";
import { formatCurrency } from "../../lib/format";
import { resolveFollowUpTarget } from "../../lib/followUpHelpers";
import { useStore } from "../../lib/store";
import type { FollowUp } from "../../types";

interface FollowUpRowProps {
  followUp: FollowUp;
  onComplete: (followUp: FollowUp) => void;
  onReschedule: (followUp: FollowUp) => void;
  showTime?: boolean;
}

/** One follow-up line: who it's about, WhatsApp/Call, Complete, Reschedule (spec Section 26). */
export function FollowUpRow({ followUp, onComplete, onReschedule, showTime = true }: FollowUpRowProps) {
  const { leads, clients, company } = useStore();
  const target = resolveFollowUpTarget(followUp, { leads, clients });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-2.5 border-b border-outline-variant/60 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-on-surface text-body-sm truncate">{target?.name || "Unknown"}</div>
        <div className="text-xs text-on-surface-variant truncate">
          {target?.business}
          {target?.value ? ` · ${formatCurrency(target.value, company.currency)}` : ""}
          {showTime && followUp.follow_up_time ? ` · ${followUp.follow_up_time}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
        <ContactActions whatsapp={target?.whatsapp} phone={target?.phone} size="sm" />
        <Button variant="secondary" size="sm" onClick={() => onReschedule(followUp)}>
          Reschedule
        </Button>
        <Button variant="primary" size="sm" onClick={() => onComplete(followUp)}>
          Complete
        </Button>
      </div>
    </div>
  );
}
