import { cn } from '@/lib/utils';

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

export function Section({
  children,
  className,
  id,
  tone = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: 'default' | 'surface' | 'brand';
}) {
  const toneClasses = {
    default: 'bg-white',
    surface: 'bg-surface',
    brand: 'bg-brand text-white',
  };
  return (
    <section id={id} className={cn('py-14 sm:py-20', toneClasses[tone], className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  center = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={cn('mb-10 max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">{eyebrow}</p>}
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-base text-muted">{description}</p>}
    </div>
  );
}
