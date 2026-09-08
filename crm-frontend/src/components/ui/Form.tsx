import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
    {children}
  </label>
);

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <div>
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand",
        error && "border-danger focus:ring-danger/30 focus:border-danger",
        className,
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
));
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, error, children, ...props }, ref) => (
  <div>
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-900",
        "focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand",
        error && "border-danger",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
));
Select.displayName = "Select";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => (
  <div>
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand",
        error && "border-danger",
        className,
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
));
Textarea.displayName = "Textarea";
