import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HostModal } from '../../components/host/HostModal';
import { useAuth } from '../../context/AuthContext';
import { formatFCFA } from '../../lib/format';
import { getEtablissementDetail, type BackendEtablissementDetail, type BackendService } from '../../lib/backendApi';

type HostEtablissement = {
  id: number;
  nom: string;
  ville: string;
};

type Draft = {
  nom: string;
  description: string; // UI-only
  prix: number;
  actif: boolean;
};

type ServiceRow = {
  id: number;
  nom: string;
  categorie?: string;
  descriptionUi: string;
  prix: number;
  actif: boolean;
  unite?: string | null;
};

const CATEGORY_FALLBACK = 'AUTRE';

function serviceToRow(s: BackendService): ServiceRow {
  const cat = s.categorie ? String(s.categorie) : undefined;
  return {
    id: s.id,
    nom: s.libelle,
    categorie: cat,
    descriptionUi: '—',
    prix: s.prix,
    actif: s.actif,
    unite: s.unite ?? undefined,
  };
}

export function HostServicesPage() {
  const { authedFetch } = useAuth();
  const [search] = useSearchParams();

  const [etablissements, setEtablissements] = useState<HostEtablissement[]>([]);
  const [selectedEtablissementId, setSelectedEtablissementId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceRow[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState<Draft>({
    nom: '',
    description: '',
    prix: 0,
    actif: true,
  });

  const modalTitle = mode === 'add' ? 'Ajouter un nouveau service' : 'Modifier le service';

  const canSubmit = draft.nom.trim().length > 0 && draft.prix > 0;

  function openAdd() {
    setMode('add');
    setEditingId(null);
    setDraft({ nom: '', description: '', prix: 0, actif: true });
    setModalOpen(true);
  }

  function openEdit(s: ServiceRow) {
    setMode('edit');
    setEditingId(s.id);
    setDraft({ nom: s.nom, description: '', prix: s.prix, actif: s.actif });
    setModalOpen(true);
  }

  async function loadEtablissements() {
    const list = await authedFetch<HostEtablissement[]>('/host/etablissements/mes').then((r) => r.data);
    setEtablissements(list);
    setSelectedEtablissementId((prev) => prev ?? (list[0]?.id ?? null));
  }

  async function loadServicesFor(etabId: number) {
    const detail = await getEtablissementDetail(etabId);
    const list = (detail as BackendEtablissementDetail).services ?? [];
    setServices(list.map(serviceToRow));
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loadEtablissements()
      .catch((e2) => {
        if (!alive) return;
        setError(e2 instanceof Error ? e2.message : 'Chargement impossible');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const etabIdFromUrl = Number(search.get('etablissementId') ?? '');
    if (Number.isFinite(etabIdFromUrl) && etabIdFromUrl > 0) {
      setSelectedEtablissementId(etabIdFromUrl);
    }
  }, [search]);

  useEffect(() => {
    if (!selectedEtablissementId) return;
    loadServicesFor(selectedEtablissementId).catch(() => setServices([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEtablissementId]);

  useEffect(() => {
    const editId = Number(search.get('editId') ?? '');
    if (!Number.isFinite(editId) || editId <= 0) return;
    const row = services.find((s) => s.id === editId);
    if (row) openEdit(row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, services]);

  async function refresh() {
    if (!selectedEtablissementId) return;
    await loadServicesFor(selectedEtablissementId);
  }

  async function submit() {
    if (!selectedEtablissementId) return;
    if (!canSubmit) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'add') {
        await authedFetch('/host/services', {
          method: 'POST',
          body: JSON.stringify({
            etablissementId: selectedEtablissementId,
            libelle: draft.nom.trim(),
            categorie: CATEGORY_FALLBACK,
            prix: draft.prix,
            unite: undefined,
            actif: draft.actif,
          }),
        });
      } else if (mode === 'edit' && editingId != null) {
        await authedFetch(`/host/services/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            libelle: draft.nom.trim(),
            categorie: CATEGORY_FALLBACK,
            prix: draft.prix,
            unite: undefined,
            actif: draft.actif,
          }),
        });
      }

      await refresh();
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(serviceId: number, next: boolean) {
    if (submitting) return;
    const row = services.find((s) => s.id === serviceId);
    if (!row) return;
    setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, actif: next } : s)));
    try {
      await authedFetch(`/host/services/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          actif: next,
          libelle: row.nom,
          categorie: CATEGORY_FALLBACK,
          prix: row.prix,
          unite: undefined,
        }),
      });
      await refresh();
    } catch {
      await refresh();
    }
  }

  async function deleteService(serviceId: number) {
    try {
      await authedFetch(`/host/services/${serviceId}`, { method: 'DELETE' });
      await refresh();
    } catch {
      await refresh();
    }
  }

  const categoryLabel = useMemo(() => {
    const map: Record<string, string> = {
      PETIT_DEJEUNER: 'Petit-déjeuner',
      MENAGE: 'Ménage',
      PARKING: 'Parking',
      WIFI: 'WiFi',
      ANIMAUX: 'Animaux',
      CLIMATISATION: 'Climatisation',
      AUTRE: 'Autre',
    };
    return map;
  }, []);

  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Gestion des services</h1>
          <p className="mt-1 text-sm text-muted">Gérez vos services additionnels (données via l&apos;API).</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 rounded-control bg-ink px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Ajouter un service
        </button>
      </div>

      {etablissements.length > 0 ? (
        <div className="mt-4">
          <label className="text-sm font-semibold text-ink">
            Établissement
            <select
              value={selectedEtablissementId ?? ''}
              onChange={(e) => setSelectedEtablissementId(Number(e.target.value))}
              className="ml-3 rounded-control bg-surface px-3 py-2 text-sm text-ink outline-none ring-brand focus:ring-2"
            >
              {etablissements.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom} ({e.ville})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Chargement…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      ) : services.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Aucun service pour le moment.</p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className="rounded-card border border-line bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-ink">{s.nom}</h2>
                  <p className="mt-1 text-sm text-muted line-clamp-2">{s.descriptionUi}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-brand">{formatFCFA(s.prix)}</p>
                  <p className="text-xs text-muted">FCFA</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-muted">
                  {s.categorie ? `Catégorie : ${categoryLabel[s.categorie] ?? s.categorie}` : 'Catégorie : —'}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-3 text-sm">
                  <span className="text-muted">Disponible</span>
                  <input
                    type="checkbox"
                    checked={s.actif}
                    onChange={(e) => void toggleActive(s.id, e.target.checked)}
                    className="h-4 w-4 accent-ink"
                    aria-label="Toggle disponible"
                  />
                  <span className="text-ink font-semibold">{s.actif ? 'On' : 'Off'}</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-ink hover:underline"
                    aria-label="Modifier le service"
                    onClick={() => openEdit(s)}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    aria-label="Supprimer le service"
                    onClick={() => void deleteService(s.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <HostModal
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-control border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="rounded-control bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!canSubmit || submitting}
              onClick={() => void submit()}
            >
              {mode === 'add' ? 'Ajouter' : 'Enregistrer'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <label className="block text-sm font-semibold text-ink">
            Nom du service
            <input
              value={draft.nom}
              onChange={(e) => setDraft((p) => ({ ...p, nom: e.target.value }))}
              className="mt-2 w-full rounded-control bg-surface px-3 py-2.5 text-sm text-ink outline-none ring-brand focus:ring-2"
            />
          </label>

          <label className="block text-sm font-semibold text-ink">
            Description (UI seulement)
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              className="mt-2 min-h-[90px] w-full resize-none rounded-control bg-surface px-3 py-2.5 text-sm text-ink outline-none ring-brand focus:ring-2"
            />
          </label>

          <label className="block text-sm font-semibold text-ink">
            Prix (FCFA)
            <input
              type="number"
              min={0}
              value={draft.prix}
              onChange={(e) => setDraft((p) => ({ ...p, prix: Number(e.target.value) }))}
              className="mt-2 w-full rounded-control bg-surface px-3 py-2.5 text-sm text-ink outline-none ring-brand focus:ring-2"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-control bg-surface px-4 py-3 text-sm">
            <span className="text-muted font-semibold text-ink">Disponible</span>
            <input
              type="checkbox"
              checked={draft.actif}
              onChange={(e) => setDraft((p) => ({ ...p, actif: e.target.checked }))}
              className="h-4 w-4 accent-ink"
            />
          </label>
        </div>
      </HostModal>
    </div>
  );
}

