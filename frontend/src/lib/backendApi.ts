export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type BackendEtablissement = {
  id: number;
  typeEtablissementId?: number | null;
  typeEtablissementLibelle?: string | null;
  /** URLs servies par l’API (/api/files/...) */
  photoUrls?: string[] | null;
  nom: string;
  description: string;
  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
  latitude: number | null;
  longitude: number | null;
  actif: boolean;
  /** Si false, l’hébergement n’apparaît pas dans la recherche publique tant que l’admin n’a pas validé. */
  valideAdmin?: boolean;
  proprietaireId: number;
  createdAt: string;
  // legacy/compat
  typeEtablissement?: string;
};

export type BackendChambre = {
  id: number;
  nom: string;
  /** Nom choisi par l’hôte (affichage voyageur), sinon utiliser {@link nom}. */
  nomPersonnalise?: string | null;
  prixNuit: number;
  capacitePersonnes: number;
  typeChambreId?: number;
  typeChambreLibelle?: string | null;
  statut?: string;
  etablissementId?: number;
  /** URLs servies par l’API (/api/files/...) */
  photoUrls?: string[] | null;
};

export type BackendEtablissementDetail = {
  id: number;
  nom: string;
  description: string;
  adresse: string;
  ville: string;
  chambres: BackendChambre[];
  hasCatalogue: boolean;
  services: BackendService[];
  photoUrls?: string[] | null;
};

export type BackendService = {
  id: number;
  libelle: string;
  categorie?: string;
  prix: number;
  unite?: string | null;
  actif: boolean;
};

export type BackendAvis = {
  id: number;
  note: number;
  commentaire: string;
  reponseHote: string | null;
  dateReponse: string | null;
  auteurId: number;
  createdAt?: string;
  etablissementId?: number;
  reservationId?: number | null;
};

/** Référentiel public (GET sans JWT). */
export type BackendTypeEtablissement = {
  id: number;
  libelle: string;
  description?: string;
};

const API_ROOT = '/api';

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function backendFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${API_ROOT}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await parseJson<{ message?: string }>(res);
      if (err?.message) message = err.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return parseJson<T>(res);
}

export async function getEtablissements(params: {
  page?: number;
  size?: number;
  ville?: string;
  keyword?: string;
  /** ISO yyyy-MM-dd ; filtre disponibilité avec {@link dateFin} */
  dateDebut?: string;
  /** ISO yyyy-MM-dd */
  dateFin?: string;
  /** Appliqué seulement si les deux dates sont valides côté API */
  nombreVoyageurs?: number;
  type?: string;
  sort?: string;
}): Promise<PageResponse<BackendEtablissement>> {
  const q = new URLSearchParams();
  q.set('page', String(params.page ?? 0));
  q.set('size', String(params.size ?? 9));
  if (params.ville) q.set('ville', params.ville);
  if (params.keyword) q.set('keyword', params.keyword);
  if (params.dateDebut) q.set('dateDebut', params.dateDebut);
  if (params.dateFin) q.set('dateFin', params.dateFin);
  if (params.nombreVoyageurs != null && params.nombreVoyageurs >= 1) {
    q.set('nombreVoyageurs', String(params.nombreVoyageurs));
  }
  if (params.type) q.set('type', params.type);
  if (params.sort) q.set('sort', params.sort);
  return backendFetch<PageResponse<BackendEtablissement>>(`/etablissements?${q.toString()}`);
}

export async function getEtablissementDetail(id: number): Promise<BackendEtablissementDetail> {
  return backendFetch<BackendEtablissementDetail>(`/etablissements/${id}`);
}

export async function getAvisByEtablissement(id: number): Promise<BackendAvis[]> {
  return backendFetch<BackendAvis[]>(`/avis/etablissement/${id}`);
}

export async function getTypesEtablissementActifs(): Promise<BackendTypeEtablissement[]> {
  const list = await backendFetch<BackendTypeEtablissement[]>(`/v1/type-etablissement`);
  return Array.isArray(list) ? list : [];
}

export type BackendCatalogTypeChambre = {
  id: number;
  libelle: string;
  description?: string;
};

/** Liste publique des types de base (style Booking). Essaie deux URLs (alias API). */
export async function getTypesChambreActifs(): Promise<BackendCatalogTypeChambre[]> {
  const paths = ['/type-chambres', '/v1/type-chambre'] as const;
  let lastError: Error | null = null;
  for (const p of paths) {
    try {
      const list = await backendFetch<BackendCatalogTypeChambre[]>(p);
      if (Array.isArray(list)) {
        return list;
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  if (lastError) {
    throw lastError;
  }
  return [];
}

