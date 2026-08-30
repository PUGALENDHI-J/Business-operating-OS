import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, TextInput } from "../ui/FormField";
import { completeFollowUp, rescheduleFollowUp } from "../../lib/cascades";
import { toast } from "../ui/Toast";
import type { FollowUp, FollowUpOutcome } from "../../types";

const OUTCOMES: FollowUpOutcome[] = ["No Answer", "Interested", "Call Back Later", "Proposal Requested", "Confirmed", "Not Interested", "Other"];

interface FollowUpActionModalProps {
  followUp: FollowUp | null;
  mode: "complete" | "reschedule" | null;
  onClose: () => void;
}

/**
 * Complete (outcome picker, spec Section 27) and Reschedule (quick options,
 * spec Section 28) actions for a follow-up. One modal, two modes, so both
 * the Dashboard "Today's Follow-ups" widget and the Client Profile follow-up
 * list can share the exact same working buttons.
 */
export function FollowUpActionModal({ followUp, mode, onClose }: FollowUpActionModalProps) {
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  if (!followUp || !mode) return null;

  function complete(outcome: FollowUpOutcome) {
    if (!followUp) return;
    completeFollowUp(followUp.id, outcome);
    toast.success("Follow-up completed");
    onClose();
  }

  function reschedule(date: Date, time?: string) {
    if (!followUp) return;
    rescheduleFollowUp(followUp.id, date.toISOString(), time);
    toast.success("Follow-up rescheduled");
    onClose();
  }

  function quickReschedule(kind: "later-today" | "tomorrow" | "next-week") {
    const now = new Date();
    if (kind === "later-today") {
      now.setHours(now.getHours() + 3);
      reschedule(now);
    } else if (kind === "tomorrow") {
      now.setDate(now.getDate() + 1);
      reschedule(now);
    } else {
      now.setDate(now.getDate() + 7);
      reschedule(now);
    }
  }

  function submitCustom() {
    if (!customDate) {
      toast.error("Pick a date");
      return;
    }
    reschedule(new Date(customDate), customTime || undefined);
  }

  return (
    <Modal open={!!followUp} onClose={onClose} title={mode === "complete" ? "Complete Follow-up" : "Reschedule Follow-up"} width={420}>
      {mode === "complete" ? (
        <div className="grid grid-cols-2 gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o}
              onClick={() => complete(o)}
              className="text-left px-3 py-2.5 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 text-body-sm font-body-sm text-on-surface transition-colors"
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" onClick={() => quickReschedule("later-today")}>
              Later Today
            </Button>
            <Button variant="secondary" onClick={() => quickReschedule("tomorrow")}>
              Tomorrow
            </Button>
            <Button variant="secondary" onClick={() => quickReschedule("next-week")}>
              Next Week
            </Button>
          </div>
          <div className="border-t border-outline-variant pt-4">
            <Field label="Custom Date">
              <TextInput type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </Field>
            <Field label="Custom Time">
              <TextInput type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
            </Field>
            <Button variant="primary" className="w-full" onClick={submitCustom}>
              Reschedule
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
