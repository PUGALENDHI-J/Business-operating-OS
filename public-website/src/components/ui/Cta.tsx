import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'whatsapp' | 'ghost';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'bg-gold text-brand-dark hover:bg-gold-light',
  outline: 'border-2 border-white text-white hover:bg-white/10',
  whatsapp: 'bg-whatsapp text-white hover:brightness-95',
  ghost: 'text-brand hover:bg-brand/5',
};

interface CtaLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
}

export function CtaLink({ variant = 'primary', size = 'md', className, children, ...props }: CtaLinkProps) {
  const sizeClasses = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-sm', lg: 'px-8 py-4 text-base' };
  return (
    <Link
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold shadow-sm transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function CtaButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: { variant?: Variant; size?: 'sm' | 'md' | 'lg' } & ComponentPropsWithoutRef<'button'>) {
  const sizeClasses = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-sm', lg: 'px-8 py-4 text-base' };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
