import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Palette, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { api, ProTheme } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/* ─── Constants ─────────────────────────────────────── */
const FONTS = ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Playfair Display', 'Lato', 'Open Sans'];
const POSITIONS = [
  { value: 'left',   label: 'Gauche' },
  { value: 'center', label: 'Centre' },
  { value: 'right',  label: 'Droite' },
] as const;
const HEADER_HEIGHTS = [
  { value: 'small',  label: 'Petit (64 px)' },
  { value: 'medium', label: 'Moyen (80 px)' },
  { value: 'large',  label: 'Grand (120 px)' },
  { value: 'hero',   label: 'Héro (200 px)' },
] as const;

const DEFAULT_THEME: Omit<ProTheme, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Nouveau Thème',
  logo_position: 'left',
  header_height: 'medium',
  header_bg_color: '#FFFFFF',
  header_text_color: '#1A365D',
  font_family: 'Inter',
  nav_position: 'right',
  nav_has_background: true,
  nav_bg_color: '#FFFFFF',
  nav_text_color: '#1A365D',
  nav_hover_color: '#F97316',
  button_color: '#F97316',
  button_text_color: '#FFFFFF',
  footer_bg_color: '#1A365D',
  footer_text_color: '#FFFFFF',
};

/* ─── Live Preview ───────────────────────────────────── */
function ThemePreview({ theme }: { theme: Partial<ProTheme> }) {
  const headerHeightMap: Record<string, string> = {
    small: '48px', medium: '64px', large: '96px', hero: '140px',
  };
  const headerH = headerHeightMap[theme.header_height ?? 'medium'] ?? '64px';

  const logoAlignMap: Record<string, string> = {
    left: 'flex-start', center: 'center', right: 'flex-end',
  };
  const navJustifyMap: Record<string, string> = {
    left: 'flex-start', center: 'center', right: 'flex-end',
  };

  return (
    <div
      className="border rounded-lg overflow-hidden text-xs"
      style={{ fontFamily: theme.font_family ?? 'Inter', fontSize: '10px' }}
    >
      {/* Header */}
      <div
        style={{
          background: theme.header_bg_color ?? '#FFFFFF',
          height: headerH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: logoAlignMap[theme.logo_position ?? 'left'],
          padding: '0 12px',
          borderBottom: '1px solid #e5e7eb',
          gap: '8px',
        }}
      >
        {/* Fake logo */}
        <div
          style={{
            width: '24px', height: '24px', borderRadius: '4px',
            background: theme.button_color ?? '#F97316',
          }}
        />
        <span style={{ color: theme.header_text_color ?? '#1A365D', fontWeight: 700 }}>
          Entreprise
        </span>
      </div>

      {/* Nav */}
      <div
        style={{
          background: (theme.nav_has_background ?? true) ? (theme.nav_bg_color ?? '#FFFFFF') : 'transparent',
          padding: '4px 12px',
          display: 'flex',
          justifyContent: navJustifyMap[theme.nav_position ?? 'right'],
          gap: '8px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {['Accueil', 'Modèles', 'Contact'].map((l) => (
          <span key={l} style={{ color: theme.nav_text_color ?? '#1A365D', fontWeight: 500 }}>{l}</span>
        ))}
      </div>

      {/* Body */}
      <div style={{ background: '#f9fafb', padding: '12px', minHeight: '60px' }}>
        <div style={{ color: '#374151', marginBottom: '8px', fontWeight: 600, fontSize: '11px' }}>
          Contenu de la page
        </div>
        <button
          style={{
            background: theme.button_color ?? '#F97316',
            color: theme.button_text_color ?? '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 10px',
            fontWeight: 600,
            cursor: 'default',
          }}
        >
          Demander un devis
        </button>
      </div>

      {/* Footer */}
      <div
        style={{
          background: theme.footer_bg_color ?? '#1A365D',
          color: theme.footer_text_color ?? '#FFFFFF',
          padding: '6px 12px',
          textAlign: 'center',
        }}
      >
        © 2025 Entreprise
      </div>
    </div>
  );
}

/* ─── Color Field ────────────────────────────────────── */
function ColorField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border cursor-pointer p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-xs h-8"
          placeholder="#FFFFFF"
          maxLength={7}
        />
      </div>
    </div>
  );
}

/* ─── Select Row ─────────────────────────────────────── */
function SelectRow<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 py-1 px-2 rounded border text-xs transition-colors ${
              value === o.value
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function ThemesPage() {
  const [themes, setThemes] = useState<ProTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ProTheme> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadThemes(); }, []);

  const loadThemes = async () => {
    try {
      setLoading(true);
      const data = await api.getProThemes();
      setThemes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing({ ...DEFAULT_THEME });
    setIsDialogOpen(true);
  };

  const openEdit = (t: ProTheme) => {
    setEditing({ ...t });
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!editing?.name?.trim()) {
      toast({ title: 'Erreur', description: 'Le nom du thème est requis.', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      if (editing.id) {
        await api.updateProTheme(editing as ProTheme & { id: number });
        toast({ title: 'Thème mis à jour' });
      } else {
        await api.createProTheme(editing as Omit<ProTheme, 'id'> & { name: string });
        toast({ title: 'Thème créé' });
      }
      setIsDialogOpen(false);
      loadThemes();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTheme = async (id: number) => {
    if (!confirm('Supprimer ce thème ? Les utilisateurs qui l\'utilisent reviendront au thème par défaut.')) return;
    try {
      await api.deleteProTheme(id);
      toast({ title: 'Thème supprimé' });
      loadThemes();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const set = (field: keyof ProTheme, value: any) =>
    setEditing((prev) => prev ? { ...prev, [field]: value } : prev);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Thèmes & Designs</h1>
          <p className="text-gray-500 mt-1">Créez et gérez les thèmes des sites professionnels</p>
        </div>
        <Button onClick={openNew} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Thème
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <Card key={theme.id} className={`overflow-hidden ${theme.id === 1 ? 'border-orange-300' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4 text-orange-500" />
                      {theme.name}
                    </CardTitle>
                    {theme.id === 1 && (
                      <Badge variant="secondary" className="mt-1 text-xs">Défaut Sunbox</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewOpen(previewOpen === theme.id ? null : theme.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(theme)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {theme.id !== 1 && (
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteTheme(theme.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Color swatches */}
                <div className="flex gap-1 flex-wrap">
                  {[
                    { label: 'Header', color: theme.header_bg_color },
                    { label: 'Texte', color: theme.header_text_color },
                    { label: 'Nav', color: theme.nav_bg_color },
                    { label: 'Bouton', color: theme.button_color },
                    { label: 'Footer', color: theme.footer_bg_color },
                  ].map((s) => (
                    <div key={s.label} className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-5 h-5 rounded border border-gray-200"
                        style={{ background: s.color }}
                        title={`${s.label}: ${s.color}`}
                      />
                      <span className="text-[9px] text-gray-400">{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div>Police : {theme.font_family}</div>
                  <div>Logo : {theme.logo_position === 'left' ? 'Gauche' : theme.logo_position === 'center' ? 'Centre' : 'Droite'}</div>
                  <div>Menu : {theme.nav_position === 'left' ? 'Gauche' : theme.nav_position === 'center' ? 'Centre' : 'Droite'}{theme.nav_has_background ? ' (fond)' : ' (transparent)'}</div>
                </div>
                {previewOpen === theme.id && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">Aperçu</p>
                    <ThemePreview theme={theme} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {themes.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Palette className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun thème créé.</p>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? `Modifier : ${editing.name}` : 'Nouveau Thème'}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: form */}
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <Label>Nom du thème *</Label>
                  <Input
                    value={editing.name ?? ''}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Ex: Thème Océan"
                    disabled={editing.id === 1}
                  />
                  {editing.id === 1 && (
                    <p className="text-xs text-gray-400 mt-1">Le thème Sunbox par défaut ne peut pas être renommé.</p>
                  )}
                </div>

                {/* Font */}
                <div>
                  <Label className="text-xs">Police</Label>
                  <select
                    value={editing.font_family ?? 'Inter'}
                    onChange={(e) => set('font_family', e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white"
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                {/* Logo position */}
                <SelectRow
                  label="Position du logo"
                  value={(editing.logo_position ?? 'left') as 'left' | 'center' | 'right'}
                  options={POSITIONS}
                  onChange={(v) => set('logo_position', v)}
                />

                {/* Header height */}
                <SelectRow
                  label="Hauteur du header"
                  value={(editing.header_height ?? 'medium') as 'small' | 'medium' | 'large' | 'hero'}
                  options={HEADER_HEIGHTS}
                  onChange={(v) => set('header_height', v)}
                />

                {/* Header colors */}
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Fond header" value={editing.header_bg_color ?? '#FFFFFF'} onChange={(v) => set('header_bg_color', v)} />
                  <ColorField label="Texte header" value={editing.header_text_color ?? '#1A365D'} onChange={(v) => set('header_text_color', v)} />
                </div>

                {/* Nav */}
                <SelectRow
                  label="Position du menu"
                  value={(editing.nav_position ?? 'right') as 'left' | 'center' | 'right'}
                  options={POSITIONS}
                  onChange={(v) => set('nav_position', v)}
                />

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.nav_has_background ?? true}
                    onCheckedChange={(v) => set('nav_has_background', v)}
                  />
                  <Label className="text-sm">Menu avec fond</Label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Fond menu" value={editing.nav_bg_color ?? '#FFFFFF'} onChange={(v) => set('nav_bg_color', v)} />
                  <ColorField label="Texte menu" value={editing.nav_text_color ?? '#1A365D'} onChange={(v) => set('nav_text_color', v)} />
                  <ColorField label="Survol menu" value={editing.nav_hover_color ?? '#F97316'} onChange={(v) => set('nav_hover_color', v)} />
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Couleur boutons" value={editing.button_color ?? '#F97316'} onChange={(v) => set('button_color', v)} />
                  <ColorField label="Texte boutons" value={editing.button_text_color ?? '#FFFFFF'} onChange={(v) => set('button_text_color', v)} />
                </div>

                {/* Footer */}
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Fond footer" value={editing.footer_bg_color ?? '#1A365D'} onChange={(v) => set('footer_bg_color', v)} />
                  <ColorField label="Texte footer" value={editing.footer_text_color ?? '#FFFFFF'} onChange={(v) => set('footer_text_color', v)} />
                </div>
              </div>

              {/* Right: live preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Aperçu en direct</p>
                <ThemePreview theme={editing} />
                <p className="text-xs text-gray-400">
                  L'aperçu illustre le header, la navigation et le footer selon les paramètres choisis.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
