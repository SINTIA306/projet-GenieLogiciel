import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type BackNavLogoProps = {
  to?: string;
  label?: string;
  className?: string;
};

export function BackNavLogo({ to = '/', label = 'Retour', className = '' }: BackNavLogoProps) {
  return (
    <Link
      to={to}
      className={[
        'group inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-line/90 bg-white/90 py-1.5 pl-1.5 pr-4',
        'text-sm font-semibold text-ink shadow-sm ring-1 ring-black/[0.04]',
        'backdrop-blur-sm transition duration-200',
        'hover:-translate-y-0.5 hover:border-brand/25 hover:bg-white hover:text-brand hover:shadow-md hover:ring-brand/10',
        'active:translate-y-0 active:shadow-sm',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/12 to-brand/5 text-brand transition duration-200 group-hover:from-brand/20 group-hover:to-brand/10 group-hover:shadow-inner"
        aria-hidden
      >
        <ArrowLeft
          className="h-[18px] w-[18px] transition-transform duration-200 group-hover:-translate-x-0.5"
          strokeWidth={2.25}
        />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
