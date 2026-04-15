import { MapPin, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { AmenityGrid } from '../../components/AmenityGrid';
import { BackNavLogo } from '../../components/BackNavLogo';
import { HelpFab } from '../../components/HelpFab';
import { HostModal } from '../../components/host/HostModal';
import { StarRating } from '../../components/StarRating';
import { useBooking } from '../../context/BookingContext';
import { formatFCFA } from '../../lib/format';
import {
  getAvisByEtablissement,
  getEtablissementDetail,
  type BackendAvis,
  type BackendChambre,
} from '../../lib/backendApi';

type UiAmenity = { icon: string; label: string };

type UiRoom = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  image: string;
  /** Galerie pour la fiche détail (fallback si vide : image seule). */
  gallery: string[];
  statut?: string;
};

type UiHotel = {
  id: number;
  name: string;
  description: string;
  address: string;
  ville: string;
  qualityBadge: boolean;
  rating: number;
  reviewCount: number;
  fromPrice: number;
  cover: string;
  gallery: string[];
  amenities: UiAmenity[];
  rooms: UiRoom[];
};

const amenitiesFallback: UiAmenity[] = [
  { icon: 'wifi', label: 'WiFi' },
  { icon: 'utensils', label: 'Restaurant' },
  { icon: 'waves', label: 'Piscine' },
  { icon: 'car', label: 'Parking' },
  { icon: 'sparkles', label: 'Spa' },
];

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function coverById(id: number) {
  const images = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
    'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
  ];
  return images[Math.abs(id) % images.length]!;
}

function galleryById(id: number) {
  const cover = coverById(id);
  return [cover, cover, cover];
}

function roomImageFallback(hotelId: number, roomId: number) {
  // Réutilisation d’images génériques tant que l’upload photo n’est pas branché.
  return coverById(hotelId + roomId);
}

function mapRoom(h: number, r: BackendChambre, index: number): UiRoom {
  const displayName = (r.nomPersonnalise?.trim() || r.nom?.trim() || 'Chambre').trim();
  const fromApi = (r.photoUrls ?? []).filter((u): u is string => Boolean(u && String(u).trim()));
  const fallback = roomImageFallback(h, Number(r.id) || index);
  const gallery = fromApi.length > 0 ? fromApi : [fallback];
  return {
    id: String(r.id),
    name: displayName,
    description: r.typeChambreLibelle ?? '',
    capacity: toNumber(r.capacitePersonnes),
    pricePerNight: toNumber(r.prixNuit),
    image: gallery[0]!,
    gallery,
    statut: r.statut,
  };
}

function mapAvis(a: BackendAvis): { user: string; note: number; text: string } {
  return {
    user: `Voyageur #${a.auteurId}`,
    note: a.note,
    text: a.commentaire || '',
  };
}

export function HotelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setDraft } = useBooking();

  const hotelId = id ? Number(id) : NaN;

  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState<UiHotel | null>(null);
  const [avis, setAvis] = useState<Array<{ user: string; note: number; text: string }>>([]);

  const [tab, setTab] = useState<'chambres' | 'services' | 'avis'>('chambres');
  const [mainImg, setMainImg] = useState(0);
  const [roomDetail, setRoomDetail] = useState<UiRoom | null>(null);
  const [roomDetailImg, setRoomDetailImg] = useState(0);

  useEffect(() => {
    if (!id || !Number.isFinite(hotelId)) return;
    let alive = true;
    setLoading(true);

    Promise.all([getEtablissementDetail(hotelId), getAvisByEtablissement(hotelId).catch(() => [])])
      .then(([detail, avisRes]) => {
        if (!alive) return;
        const rooms = detail.chambres.map((r, idx) => mapRoom(detail.id, r, idx));
        const fromPrice = rooms[0]?.pricePerNight ?? 0;
        const rating = 4.4 + (detail.id % 3) * 0.1;
        setHotel({
          id: detail.id,
          name: detail.nom,
          description: detail.description,
          address: detail.adresse,
          ville: detail.ville,
          qualityBadge: Boolean(detail.hasCatalogue),
          rating,
          reviewCount: 120 + (detail.id % 200),
          fromPrice,
          cover: coverById(detail.id),
          gallery: galleryById(detail.id),
          amenities: amenitiesFallback,
          rooms,
        });
        setAvis((avisRes as BackendAvis[]).map(mapAvis));
      })
      .catch(() => {
        if (!alive) return;
        setHotel(null);
        setAvis([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id, hotelId]);

  function startBooking(roomId: string) {
    if (!hotel) return;
    const room = hotel.rooms.find((r) => r.id === roomId);
    if (!room) return;
    setRoomDetail(null);
    setDraft({
      hotelId: String(hotel.id),
      hotelName: hotel.name,
      ville: hotel.ville,
      roomId: room.id,
      roomName: room.name,
      roomDescription: room.description,
      capacity: room.capacity,
      pricePerNight: room.pricePerNight,
      services: [],
      reservationRef: null,
    });
    navigate('/reservation');
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="p-8 text-center">
        <p>Établissement introuvable.</p>
        <div className="mt-2 flex justify-center">
          <BackNavLogo to="/" label="Retour accueil" />
        </div>
      </div>
    );
  }

  const gallery = hotel.gallery;
  const mainSrc = gallery[mainImg] ?? hotel.cover;

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <BackNavLogo to="/" label="Retour accueil" />
        <div className="grid gap-4 lg:grid-cols-[1fr_220px] lg:items-start">
          <div className="overflow-hidden rounded-card bg-white">
            <div className="grid gap-2 lg:grid-cols-[1fr_100px]">
              <div className="aspect-[16/10] overflow-hidden lg:col-span-1">
                <img src={mainSrc} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col">
                {gallery.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setMainImg(i)}
                    className={`h-20 w-28 shrink-0 overflow-hidden rounded-lg lg:h-24 lg:w-full ${
                      i === mainImg ? 'ring-2 ring-brand' : ''
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 -mt-8 rounded-card border border-line bg-white p-5 shadow-card lg:mt-0 lg:sticky lg:top-24">
            <h3 className="text-center font-bold text-ink">Réservation rapide</h3>
            <p className="mt-2 text-center text-xs text-muted">À partir de</p>
            <p className="text-center text-2xl font-bold text-brand">
              {formatFCFA(hotel.fromPrice)}
            </p>
            <p className="text-center text-xs text-muted">par nuit</p>
            <button
              type="button"
              onClick={() => hotel.rooms[0] && startBooking(hotel.rooms[0].id)}
              className="mt-4 w-full rounded-control bg-ink py-3 text-sm font-semibold text-white"
            >
              Réserver maintenant
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              Annulation gratuite jusqu&apos;à 24h avant l&apos;arrivée
            </p>
          </div>
        </div>

        <div className="mt-8 lg:pr-[calc(220px+1rem)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink md:text-3xl">{hotel.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StarRating value={hotel.rating} />
                {hotel.qualityBadge && (
                  <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-white">
                    Badge Qualité
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                <MapPin className="h-4 w-4 text-red-500" />
                {hotel.address}, {hotel.ville}
              </p>
              <p className="mt-3 max-w-2xl text-sm text-muted">{hotel.description}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-amber-400">
                <StarRating value={hotel.rating} />
              </div>
              <p className="text-sm font-semibold text-ink">{hotel.rating}</p>
              <p className="text-xs text-muted">{hotel.reviewCount} avis</p>
            </div>
          </div>

          <div className="mt-8 rounded-card border border-line bg-white p-6 shadow-card">
            <h2 className="font-bold text-ink">Services inclus</h2>
            <div className="mt-6">
              <AmenityGrid items={hotel.amenities} />
            </div>
          </div>

          <div className="mt-6 rounded-control bg-[#e5e7eb]/80 p-1">
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ['chambres', 'Chambres'],
                  ['services', 'Services payants'],
                  ['avis', 'Avis'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`rounded-lg py-2.5 text-sm font-medium ${
                    tab === k ? 'bg-white text-ink shadow-sm' : 'text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'chambres' && (
            <div className="mt-6 space-y-4">
              {hotel.rooms.map((room) => (
                <article
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Voir le détail de ${room.name}`}
                  onClick={() => {
                    setRoomDetail(room);
                    setRoomDetailImg(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setRoomDetail(room);
                      setRoomDetailImg(0);
                    }
                  }}
                  className="flex cursor-pointer flex-col gap-4 rounded-card border border-line bg-white p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md sm:flex-row"
                >
                  <img
                    src={room.image}
                    alt=""
                    className="pointer-events-none h-44 w-full rounded-lg object-cover sm:h-36 sm:w-48 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-ink">{room.name}</h3>
                        <p className="text-sm text-muted">{room.description}</p>
                        <p className="mt-2 text-sm text-muted">
                          Capacité : {room.capacity} personne(s)
                        </p>
                        <p className="mt-1 text-xs font-medium text-brand">Cliquer pour voir le détail</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-brand">
                          {formatFCFA(room.pricePerNight)}
                        </p>
                        <p className="text-xs text-muted">par nuit</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startBooking(room.id);
                          }}
                          className="mt-2 rounded-control bg-ink px-4 py-2 text-xs font-semibold text-white"
                        >
                          Réserver
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {tab === 'services' && (
            <p className="mt-6 text-sm text-muted">
              Les services payants seront proposés à l&apos;étape suivante du parcours de réservation
              (maquette « Services additionnels »).
            </p>
          )}

          {tab === 'avis' && (
            <div className="mt-6 space-y-4">
              {avis.length === 0 ? (
                <p className="text-sm text-muted">Aucun avis pour cet établissement.</p>
              ) : (
                avis.map((a, idx) => (
                  <div key={`${a.user}-${idx}`} className="rounded-card border border-line bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{a.user}</span>
                      <StarRating value={a.note} size="sm" />
                    </div>
                    <p className="mt-2 text-sm text-muted">{a.text}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <HelpFab />

      <HostModal
        open={roomDetail != null}
        title={roomDetail?.name ?? 'Chambre'}
        onClose={() => setRoomDetail(null)}
        footer={
          roomDetail ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-control border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
                onClick={() => setRoomDetail(null)}
              >
                Fermer
              </button>
              <button
                type="button"
                className="rounded-control bg-ink px-4 py-2 text-sm font-semibold text-white"
                onClick={() => startBooking(roomDetail.id)}
              >
                Réserver cette chambre
              </button>
            </div>
          ) : null
        }
      >
        {roomDetail ? (
          <div className="space-y-5 text-sm text-ink">
            <div className="grid gap-3 lg:grid-cols-[1fr_88px]">
              <div className="aspect-[16/10] overflow-hidden rounded-lg bg-surface">
                <img
                  src={roomDetail.gallery[roomDetailImg] ?? roomDetail.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              {roomDetail.gallery.length > 1 ? (
                <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
                  {roomDetail.gallery.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setRoomDetailImg(i)}
                      className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg lg:h-20 lg:w-full ${
                        i === roomDetailImg ? 'ring-2 ring-brand' : ''
                      }`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {roomDetail.description ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Type</p>
                <p className="mt-1 text-ink">{roomDetail.description}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-4 text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Jusqu&apos;à {roomDetail.capacity} personne{roomDetail.capacity > 1 ? 's' : ''}
              </span>
              {roomDetail.statut ? (
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink">
                  {roomDetail.statut === 'DISPONIBLE'
                    ? 'Disponible'
                    : roomDetail.statut === 'MAINTENANCE'
                      ? 'Maintenance'
                      : roomDetail.statut === 'OCCUPEE'
                        ? 'Occupée'
                        : roomDetail.statut === 'INDISPONIBLE'
                          ? 'Indisponible'
                          : roomDetail.statut}
                </span>
              ) : null}
            </div>

            <div className="rounded-control bg-brand/10 px-4 py-3">
              <p className="text-xs text-muted">Tarif</p>
              <p className="text-xl font-bold text-brand">{formatFCFA(roomDetail.pricePerNight)}</p>
              <p className="text-xs text-muted">par nuit</p>
            </div>
          </div>
        ) : null}
      </HostModal>
    </div>
  );
}
