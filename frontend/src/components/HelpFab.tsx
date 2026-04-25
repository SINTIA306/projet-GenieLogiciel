import { HelpCircle } from 'lucide-react';

export function HelpFab() {
  return (
    <button
      type="button"
      title="Aide"
      className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white shadow-card text-muted hover:bg-surface"
    >
      <HelpCircle className="h-5 w-5" />
    </button>
  );
}
