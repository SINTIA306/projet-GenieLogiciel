import { Bell, ChevronDown, Home, Shield, UserRound } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminUser } from './RequireAdmin';
import { BrandLogo } from './BrandLogo';
import { CLIENT_HERO_BACKGROUND_IMAGE } from './ClientHeroSection';

type AppHeaderProps = {
  /** Ancien bandeau bleu uni (pages qui l’utilisent encore). */
  blueBg?: boolean;
  /** Barre transparente sur fond coloré / dégradé (page d’accueil). */
  variant?: 'default' | 'hero';
};

export function AppHeader({ blueBg = false, variant = 'default' }: AppHeaderProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [heroNavSolid, setHeroNavSolid] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (!blueBg) {
      setHeroNavSolid(false);
      return;
    }
    const onScroll = () => setHeroNavSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [blueBg]);

  const label =
    user ? `${user.prenom} ${user.nom}`.trim() || user.email : 'Se connecter';

  const hero = variant === 'hero';
  const lightLogo = blueBg || hero;
  const logementsActive = pathname === '/' || pathname.startsWith('/etablissement');
  const servicesActive = pathname.startsWith('/services');

  const tabUnderline = (active: boolean) =>
    [
      'mt-1 h-[3px] w-14 shrink-0 rounded-full transition-colors',
      active ? (lightLogo ? 'bg-white' : 'bg-ink') : 'bg-transparent',
    ].join(' ');

  const overlayClass = hero
    ? 'bg-slate-950/45 backdrop-blur-md'
    : blueBg
      ? ''
      : 'bg-white/78 backdrop-blur-sm';

  const blueBarClasses = blueBg
    ? heroNavSolid
      ? 'border-white/15 bg-brand/95 text-white shadow-md backdrop-blur-sm'
      : 'border-white/20 bg-transparent text-white'
    : '';

  return (
    <header
      className={`sticky top-0 z-40 border-b px-4 py-3 md:px-8 ${
        hero
          ? 'border-white/20 text-white'
          : blueBg
            ? blueBarClasses
            : 'border-line/80 text-ink'
      }`}
    >
      {!blueBg && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${CLIENT_HERO_BACKGROUND_IMAGE})` }}
          />
          <div className={`absolute inset-0 ${overlayClass}`} />
        </div>
      )}
      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-y-3 md:grid-cols-[1fr_auto_1fr] md:gap-x-4">
        <div className="flex justify-center md:justify-start">
          <BrandLogo light={lightLogo} />
        </div>
        <nav
          className="flex items-end justify-center gap-10 md:gap-14"
          aria-label="Navigation principale"
        >
            <Link
              to="/"
              className={`group flex flex-col items-center pb-0.5 text-center transition ${
                logementsActive
                  ? lightLogo
                    ? 'text-white'
                    : 'text-ink'
                  : lightLogo
                    ? 'text-white/75 hover:text-white'
                    : 'text-muted hover:text-ink'
              }`}
            >
              <Home
                className={`h-6 w-6 ${logementsActive ? '' : 'opacity-80'} group-hover:opacity-100`}
                strokeWidth={logementsActive ? 2.25 : 2}
              />
              <span className={`mt-1 text-sm ${logementsActive ? 'font-bold' : 'font-medium'}`}>Logements</span>
              <span className={tabUnderline(logementsActive)} aria-hidden />
            </Link>
            <Link
              to="/services"
              className={`group flex flex-col items-center pb-0.5 text-center transition ${
                servicesActive
                  ? lightLogo
                    ? 'text-white'
                    : 'text-ink'
                  : lightLogo
                    ? 'text-white/75 hover:text-white'
                    : 'text-muted hover:text-ink'
              }`}
            >
              <Bell
                className={`h-6 w-6 ${servicesActive ? '' : 'opacity-80'} group-hover:opacity-100`}
                strokeWidth={servicesActive ? 2.25 : 2}
              />
              <span className={`mt-1 text-sm ${servicesActive ? 'font-bold' : 'font-medium'}`}>Services</span>
              <span className={tabUnderline(servicesActive)} aria-hidden />
            </Link>
        </nav>
        <div className="relative flex justify-center md:justify-end" ref={ref}>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-control px-2 py-1.5 text-sm font-medium ${
                  lightLogo ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-surface'
                }`}
              >
                <UserRound className="h-5 w-5 opacity-80" />
                {label}
                <ChevronDown className="h-4 w-4 opacity-60" />
              </button>
              {open && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-56 rounded-card border border-line bg-white py-1 text-ink shadow-card"
                  role="menu"
                >
                  <Link
                    to="/profil?tab=reservations"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                    onClick={() => setOpen(false)}
                  >
                    Mes réservations
                  </Link>
                  <Link
                    to="/host"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                    onClick={() => setOpen(false)}
                  >
                    Gérer mes hébergements
                  </Link>
                  {isAdminUser(user.roles) && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                      onClick={() => setOpen(false)}
                    >
                      <Shield className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      Administration
                    </Link>
                  )}
                  <hr className="my-1 border-line" />
                  <Link
                    to="/profil?tab=parametres"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface"
                    onClick={() => setOpen(false)}
                  >
                    Paramètres
                  </Link>
                  <hr className="my-1 border-line" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link
              to="/connexion"
              className={`flex items-center gap-2 rounded-control px-3 py-2 text-sm font-medium ${
                lightLogo ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-ink text-white hover:bg-ink/90'
              }`}
            >
              <UserRound className="h-4 w-4" />
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
