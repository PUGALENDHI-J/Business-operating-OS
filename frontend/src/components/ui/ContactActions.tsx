import { Icon } from "./Icon";
import { waLink, telLink, mailLink } from "../../lib/contact";

interface ContactActionsProps {
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  size?: "sm" | "md";
  onAction?: (kind: "whatsapp" | "call" | "email") => void;
}

/**
 * Compact WhatsApp / Call / Email buttons. Never makes the user copy a
 * number manually — clicking opens the right protocol handler directly.
 * Renders nothing for a channel that has no valid number/address.
 */
export function ContactActions({ whatsapp, phone, email, size = "sm", onAction }: ContactActionsProps) {
  const wa = waLink(whatsapp);
  const call = telLink(phone);
  const mail = mailLink(email);
  const pad = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  if (!wa && !call && !mail) return null;

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          onClick={() => onAction?.("whatsapp")}
          title="WhatsApp"
          aria-label="Message on WhatsApp"
          className={`${pad} rounded-full bg-[#25D366]/15 text-[#128C4A] hover:bg-[#25D366]/25 flex items-center justify-center transition-colors flex-shrink-0`}
        >
          <Icon name="chat" size={16} />
        </a>
      )}
      {call && (
        <a
          href={call}
          onClick={() => onAction?.("call")}
          title="Call"
          aria-label="Call"
          className={`${pad} rounded-full bg-status-active-bg text-status-active-text hover:opacity-80 flex items-center justify-center transition-colors flex-shrink-0`}
        >
          <Icon name="call" size={16} />
        </a>
      )}
      {mail && (
        <a
          href={mail}
          onClick={() => onAction?.("email")}
          title="Email"
          aria-label="Email"
          className={`${pad} rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest flex items-center justify-center transition-colors flex-shrink-0`}
        >
          <Icon name="mail" size={16} />
        </a>
      )}
    </div>
  );
}
