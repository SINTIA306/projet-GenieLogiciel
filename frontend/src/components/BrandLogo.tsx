import { Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BrandLogo({
  className = '',
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${
          light ? 'bg-white/20' : 'bg-brand'
        }`}
      >
        <Building2 className="h-5 w-5" strokeWidth={2} />
      </span>
      <span
        className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}
      >
        QuickLodge
      </span>
    </Link>
  );
}
