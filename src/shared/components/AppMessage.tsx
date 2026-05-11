import { useEffect } from "react";
import { X } from "lucide-react";

export type AppMessageVariant = "success" | "error" | "warning";

export type AppMessageData = {
  text: string;
  variant: AppMessageVariant;
};

type AppMessageProps = {
  message: AppMessageData;
  onClose: () => void;
  className?: string;
};

const variantClasses: Record<AppMessageVariant, string> = {
  success: "border-emerald-300/35 bg-emerald-400/12 text-emerald-50",
  error: "border-red-300/35 bg-red-400/12 text-red-50",
  warning: "border-amber-300/35 bg-amber-300/12 text-amber-50",
};

export function AppMessage({
  message,
  onClose,
  className = "",
}: AppMessageProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [message.text, message.variant]);

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg shadow-black/10 ${variantClasses[message.variant]} ${className}`}
    >
      <span className="min-w-0 flex-1">{message.text}</span>
      <button
        type="button"
        onClick={onClose}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-current opacity-75 transition hover:bg-white/10 hover:opacity-100"
        title="Fechar mensagem"
        aria-label="Fechar mensagem"
      >
        <X size={16} />
      </button>
    </div>
  );
}
