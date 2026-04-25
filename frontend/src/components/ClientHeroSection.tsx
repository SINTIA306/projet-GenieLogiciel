import type { ReactNode } from 'react';

/** Image pleine largeur pour le bandeau bleu (navbar + titre + recherche). */
export const CLIENT_HERO_BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2400&q=80';

type ClientHeroSectionProps = {
  children: ReactNode;
};

/**
 * Bandeau client (accueil, services) : photo sur toute la hauteur du bloc bleu,
 * avec voile marque pour le contraste du texte blanc.
 */
export function ClientHeroSection({ children }: ClientHeroSectionProps) {
  return (
    <div className="relative bg-brand pb-16 pt-0 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-[center_30%] bg-no-repeat sm:bg-center"
          style={{ backgroundImage: `url(${CLIENT_HERO_BACKGROUND_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-brand/55 sm:bg-brand/50" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
