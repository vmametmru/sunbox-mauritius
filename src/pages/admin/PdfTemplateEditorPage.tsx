import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Bold,
  Italic,
  Underline,
  Merge,
  Trash2,
  Undo,
  Eye,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CellData {
  content: string;
  type?: 'text' | 'variable' | 'image';
  imageUrl?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: string;
  bgColor?: string;
  color?: string;
  merged?: boolean;
  colspan?: number;
  rowspan?: number;
}

interface TemplateData {
  id: number;
  name: string;
  description: string;
  document_type: string;
  grid_data: Record<string, CellData>;
  row_count: number;
  col_count: number;
  row_heights: number[];
  col_widths: number[];
  is_default: boolean;
  is_active: boolean;
}

const VARIABLES = [
  { group: 'Devis', items: [
    { key: '{{reference}}', label: 'Référence' },
    { key: '{{status}}', label: 'Statut' },
    { key: '{{created_at}}', label: 'Date de création' },
    { key: '{{valid_until}}', label: 'Valable jusqu\'au' },
    { key: '{{date_today}}', label: 'Date du jour' },
  ]},
  { group: 'Client', items: [
    { key: '{{customer_name}}', label: 'Nom du client' },
    { key: '{{customer_email}}', label: 'Email du client' },
    { key: '{{customer_phone}}', label: 'Téléphone du client' },
    { key: '{{customer_address}}', label: 'Adresse du client' },
    { key: '{{customer_message}}', label: 'Message du client' },
  ]},
  { group: 'Modèle', items: [
    { key: '{{model_name}}', label: 'Nom du modèle' },
    { key: '{{model_type}}', label: 'Type de modèle' },
  ]},
  { group: 'Prix', items: [
    { key: '{{base_price}}', label: 'Prix de base' },
    { key: '{{options_total}}', label: 'Total options' },
    { key: '{{total_ht}}', label: 'Total HT' },
    { key: '{{tva_rate}}', label: 'Taux TVA' },
    { key: '{{tva}}', label: 'Montant TVA' },
    { key: '{{total_ttc}}', label: 'Total TTC' },
    { key: '{{options_list}}', label: 'Liste des options' },
  ]},
  { group: 'Détails BOQ', items: [
    { key: '{{base_categories_html}}', label: 'Catégories de base (tableau)' },
    { key: '{{base_categories}}', label: 'Catégories de base (texte)' },
    { key: '{{option_categories_html}}', label: 'Catégories options (tableau)' },
    { key: '{{option_categories}}', label: 'Catégories options (texte)' },
  ]},
  { group: 'Entreprise', items: [
    { key: '{{company_phone}}', label: 'Téléphone entreprise' },
    { key: '{{company_email}}', label: 'Email entreprise' },
    { key: '{{company_address}}', label: 'Adresse entreprise' },
    { key: '{{bank_account}}', label: 'Compte bancaire' },
    { key: '{{payment_terms}}', label: 'Modalités de paiement' },
    { key: '{{site_slogan}}', label: 'Slogan' },
  ]},
];

const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Tahoma',
];

const FONT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

export default function PdfTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cell selection
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);

  // Cell edit modal
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellEditData, setCellEditData] = useState<CellData>({
    content: '', type: 'text',
    fontSize: 10, fontFamily: 'Arial', textAlign: 'left',
  });
  const editorRef = React.useRef<HTMLDivElement>(null);

  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Gallery for image picker
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Dimension editing
  const [editingRowHeight, setEditingRowHeight] = useState<number | null>(null);
  const [editingColWidth, setEditingColWidth] = useState<number | null>(null);

  useEffect(() => {
    if (id) loadTemplate(parseInt(id));
  }, [id]);

  const loadTemplate = async (tplId: number) => {
    try {
      setLoading(true);
      const result = await api.getPdfTemplate(tplId);
      if (!result) {
        toast({ title: 'Erreur', description: 'Template introuvable', variant: 'destructive' });
        navigate('/admin/pdf-templates');
        return;
      }
      // Ensure arrays exist
      if (!result.row_heights) result.row_heights = Array(result.row_count).fill(14);
      if (!result.col_widths) result.col_widths = Array(result.col_count).fill(19);
      if (!result.grid_data) result.grid_data = {};
      setTemplate(result);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadGalleryImages = async () => {
    try {
      setGalleryLoading(true);
      const response = await fetch('https://sunbox-mauritius.com/api/media.php?action=list_by_media_type&media_type=photo', {
        credentials: 'include',
      });
      const result = await response.json();
      const photos = result?.data?.items || result?.data || [];
      // Also load bandeau images
      const bannerResponse = await fetch('https://sunbox-mauritius.com/api/media.php?action=list_by_media_type&media_type=bandeau', {
        credentials: 'include',
      });
      const bannerResult = await bannerResponse.json();
      const banners = bannerResult?.data?.items || bannerResult?.data || [];
      setGalleryImages([...photos, ...banners]);
    } catch (err) {
      console.error('Failed to load gallery:', err);
      setGalleryImages([]);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('https://sunbox-mauritius.com/api/media.php?action=model_upload&model_id=0&media_type=photo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const result = await response.json();
      if (result?.data?.file?.url || result?.data?.file?.relative) {
        const imageUrl = result.data.file.url || ('/' + result.data.file.relative);
        setCellEditData({ ...cellEditData, imageUrl });
        toast({ title: 'Image uploadée' });
        // Refresh gallery
        loadGalleryImages();
      } else {
        toast({ title: 'Erreur', description: 'Upload échoué', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const saveTemplate = async () => {
    if (!template) return;
    try {
      setSaving(true);
      await api.updatePdfTemplate({
        id: template.id,
        name: template.name,
        description: template.description,
        grid_data: template.grid_data,
        row_count: template.row_count,
        col_count: template.col_count,
        row_heights: template.row_heights,
        col_widths: template.col_widths,
      });
      toast({ title: 'Succès', description: 'Template enregistré' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  const getCell = (row: number, col: number): CellData | undefined => {
    return template?.grid_data[getCellKey(row, col)];
  };

  const updateCell = (key: string, data: Partial<CellData>) => {
    if (!template) return;
    setTemplate({
      ...template,
      grid_data: {
        ...template.grid_data,
        [key]: { ...(template.grid_data[key] || { content: '', type: 'text' }), ...data },
      },
    });
  };

  const deleteCell = (key: string) => {
    if (!template) return;
    const newGridData = { ...template.grid_data };
    const cell = newGridData[key];
    // If cell has merge, also clear merged references
    if (cell?.merged && cell.colspan && cell.rowspan) {
      const [sr, sc] = key.split('-').map(Number);
      for (let r = sr; r < sr + cell.rowspan; r++) {
        for (let c = sc; c < sc + cell.colspan; c++) {
          if (r !== sr || c !== sc) {
            delete newGridData[`${r}-${c}`];
          }
        }
      }
    }
    delete newGridData[key];
    setTemplate({ ...template, grid_data: newGridData });
  };

  // Get merged cells map
  const getMergedCellsMap = useCallback((): Record<string, string> => {
    if (!template) return {};
    const map: Record<string, string> = {};
    for (const [key, cell] of Object.entries(template.grid_data)) {
      if (cell.merged && cell.colspan && cell.rowspan) {
        const [sr, sc] = key.split('-').map(Number);
        for (let r = sr; r < sr + (cell.rowspan || 1); r++) {
          for (let c = sc; c < sc + (cell.colspan || 1); c++) {
            if (r !== sr || c !== sc) {
              map[`${r}-${c}`] = key;
            }
          }
        }
      }
    }
    return map;
  }, [template]);

  // Cell click handler
  const handleCellClick = (row: number, col: number, event: React.MouseEvent) => {
    const key = getCellKey(row, col);
    const mergedMap = getMergedCellsMap();

    // If this cell is covered by a merge, select the parent
    const actualKey = mergedMap[key] || key;

    if (event.shiftKey && selectedCells.length > 0) {
      // Range selection
      const firstKey = selectedCells[0];
      const [sr, sc] = firstKey.split('-').map(Number);
      const minR = Math.min(sr, row);
      const maxR = Math.max(sr, row);
      const minC = Math.min(sc, col);
      const maxC = Math.max(sc, col);
      const newSel: string[] = [];
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          newSel.push(getCellKey(r, c));
        }
      }
      setSelectedCells(newSel);
    } else {
      setSelectedCells([actualKey]);
    }
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    const key = getCellKey(row, col);
    const mergedMap = getMergedCellsMap();
    const actualKey = mergedMap[key] || key;
    const cell = template?.grid_data[actualKey];

    setCellEditData({
      content: cell?.content || '',
      type: cell?.type || 'text',
      imageUrl: cell?.imageUrl || '',
      fontSize: cell?.fontSize || 10,
      fontFamily: cell?.fontFamily || 'Arial',
      textAlign: cell?.textAlign || 'left',
      bgColor: cell?.bgColor || '',
      color: cell?.color || '',
    });
    setEditingCell(actualKey);
  };

  const handleSaveCellEdit = () => {
    if (!editingCell || !template) return;
    const existingCell = template.grid_data[editingCell] || {};
    const htmlContent = editorRef.current?.innerHTML || cellEditData.content || '';
    updateCell(editingCell, {
      ...cellEditData,
      content: htmlContent,
      // Preserve merge info
      merged: existingCell.merged,
      colspan: existingCell.colspan,
      rowspan: existingCell.rowspan,
    });
    setEditingCell(null);
  };

  // Merge selected cells
  const handleMergeCells = () => {
    if (!template || selectedCells.length < 2) {
      toast({ title: 'Info', description: 'Sélectionnez au moins 2 cellules à fusionner (Shift+clic)' });
      return;
    }

    const coords = selectedCells.map(k => k.split('-').map(Number));
    const minR = Math.min(...coords.map(c => c[0]));
    const maxR = Math.max(...coords.map(c => c[0]));
    const minC = Math.min(...coords.map(c => c[1]));
    const maxC = Math.max(...coords.map(c => c[1]));

    const masterKey = getCellKey(minR, minC);
    const existingCell = template.grid_data[masterKey] || { content: '', type: 'text' };

    const newGridData = { ...template.grid_data };

    // Clear cells that will be merged
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const k = getCellKey(r, c);
        if (k !== masterKey) {
          delete newGridData[k];
        }
      }
    }

    // Set master cell with merge info
    newGridData[masterKey] = {
      ...existingCell,
      merged: true,
      colspan: maxC - minC + 1,
      rowspan: maxR - minR + 1,
    };

    setTemplate({ ...template, grid_data: newGridData });
    setSelectedCells([masterKey]);
    toast({ title: 'Cellules fusionnées' });
  };

  // Unmerge cell
  const handleUnmergeCells = () => {
    if (!template || selectedCells.length !== 1) return;
    const key = selectedCells[0];
    const cell = template.grid_data[key];
    if (!cell?.merged) return;

    const newGridData = { ...template.grid_data };
    newGridData[key] = {
      ...cell,
      merged: false,
      colspan: 1,
      rowspan: 1,
    };

    setTemplate({ ...template, grid_data: newGridData });
    toast({ title: 'Fusion annulée' });
  };

  // Row height / col width editing
  const handleRowHeightChange = (rowIdx: number, height: number) => {
    if (!template) return;
    const newHeights = [...template.row_heights];
    newHeights[rowIdx] = Math.max(1, Math.min(100, height));
    setTemplate({ ...template, row_heights: newHeights });
  };

  const handleColWidthChange = (colIdx: number, width: number) => {
    if (!template) return;
    const newWidths = [...template.col_widths];
    newWidths[colIdx] = Math.max(5, Math.min(100, width));
    setTemplate({ ...template, col_widths: newWidths });
  };

  // Check if cell is hidden by merge
  const isCellHiddenByMerge = (row: number, col: number): boolean => {
    const mergedMap = getMergedCellsMap();
    return !!mergedMap[getCellKey(row, col)];
  };

  // Render grid
  const renderGrid = () => {
    if (!template) return null;
    const { row_count, col_count, row_heights, col_widths, grid_data } = template;
    const mergedMap = getMergedCellsMap();

    return (
      <div className="overflow-auto border rounded-lg bg-white" style={{ maxHeight: '70vh' }}>
        <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
          {/* Column width headers */}
          <thead>
            <tr>
              <th className="w-8 min-w-8 bg-gray-100 border text-xs text-center p-0"></th>
              {Array.from({ length: col_count }, (_, c) => (
                <th
                  key={c}
                  className="bg-gray-100 border text-xs text-center p-1 cursor-pointer hover:bg-gray-200"
                  style={{ width: `${(col_widths[c] || 19) * 3}px`, minWidth: `${(col_widths[c] || 19) * 3}px` }}
                  onClick={() => setEditingColWidth(c)}
                >
                  {editingColWidth === c ? (
                    <Input
                      type="number"
                      className="h-5 w-14 text-xs p-0 text-center"
                      value={col_widths[c] || 19}
                      onChange={(e) => handleColWidthChange(c, parseInt(e.target.value) || 19)}
                      onBlur={() => setEditingColWidth(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingColWidth(null)}
                      autoFocus
                      min={5}
                      max={100}
                    />
                  ) : (
                    <span title={`${col_widths[c] || 19}mm - Cliquer pour modifier`}>
                      {c + 1}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: row_count }, (_, r) => (
              <tr key={r}>
                {/* Row number / height */}
                <td
                  className="bg-gray-100 border text-xs text-center p-1 cursor-pointer hover:bg-gray-200"
                  style={{ height: `${(row_heights[r] || 14) * 2.5}px` }}
                  onClick={() => setEditingRowHeight(r)}
                >
                  {editingRowHeight === r ? (
                    <Input
                      type="number"
                      className="h-5 w-10 text-xs p-0 text-center"
                      value={row_heights[r] || 14}
                      onChange={(e) => handleRowHeightChange(r, parseInt(e.target.value) || 14)}
                      onBlur={() => setEditingRowHeight(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingRowHeight(null)}
                      autoFocus
                      min={1}
                      max={100}
                    />
                  ) : (
                    <span title={`${row_heights[r] || 14}mm - Cliquer pour modifier`}>
                      {r + 1}
                    </span>
                  )}
                </td>
                {/* Data cells */}
                {Array.from({ length: col_count }, (_, c) => {
                  const key = getCellKey(r, c);

                  // Skip cells hidden by merge
                  if (mergedMap[key]) return null;

                  const cell = grid_data[key];
                  const isSelected = selectedCells.includes(key);
                  const colspan = cell?.colspan || 1;
                  const rowspan = cell?.rowspan || 1;

                  const cellStyle: React.CSSProperties = {
                    width: `${(col_widths[c] || 19) * 3}px`,
                    minWidth: `${(col_widths[c] || 19) * 3}px`,
                    height: `${(row_heights[r] || 14) * 2.5}px`,
                    fontSize: cell?.fontSize ? `${cell.fontSize}px` : '10px',
                    fontFamily: cell?.fontFamily || 'Arial',
                    textAlign: (cell?.textAlign as any) || 'left',
                    backgroundColor: cell?.bgColor || (isSelected ? '#fef3c7' : 'transparent'),
                    color: cell?.color || 'inherit',
                    verticalAlign: 'middle',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    cursor: 'pointer',
                    padding: '2px 4px',
                  };

                  if (isSelected) {
                    cellStyle.outline = '2px solid #f97316';
                    cellStyle.outlineOffset = '-1px';
                  }

                  let displayContent = cell?.content || '';
                  if (cell?.type === 'image') {
                    displayContent = cell.imageUrl ? '🖼 Image' : '🖼';
                  }

                  return (
                    <td
                      key={key}
                      className="border border-gray-300 select-none"
                      style={cellStyle}
                      colSpan={colspan > 1 ? colspan : undefined}
                      rowSpan={rowspan > 1 ? rowspan : undefined}
                      onClick={(e) => handleCellClick(r, c, e)}
                      onDoubleClick={() => handleCellDoubleClick(r, c)}
                      title={displayContent || 'Double-clic pour éditer'}
                    >
                      <div className="truncate text-xs" dangerouslySetInnerHTML={{ __html: displayContent }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Template introuvable</p>
        <Button variant="link" onClick={() => navigate('/admin/pdf-templates')}>Retour</Button>
      </div>
    );
  }

  const selectedCell = selectedCells.length === 1 ? template.grid_data[selectedCells[0]] : null;
  const hasMultiSelection = selectedCells.length > 1;
  const isMerged = selectedCell?.merged;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/pdf-templates')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-xl font-bold text-[#1A365D] flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              {template.name}
            </h1>
            <p className="text-sm text-gray-500">{template.description || 'Éditeur de template PDF'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
          <Button onClick={saveTemplate} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Merge/Unmerge */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleMergeCells}
              disabled={!hasMultiSelection}
              title="Fusionner les cellules sélectionnées (Shift+clic pour multi-sélection)"
            >
              <Merge className="h-4 w-4 mr-1" />
              Fusionner
            </Button>
            {isMerged && (
              <Button size="sm" variant="outline" onClick={handleUnmergeCells}>
                <Undo className="h-4 w-4 mr-1" />
                Défusionner
              </Button>
            )}

            <div className="h-6 w-px bg-gray-300" />

            {/* Quick formatting for selected cell */}
            {selectedCells.length === 1 && (
              <>
                <Select
                  value={String(selectedCell?.fontSize || 10)}
                  onValueChange={(v) => updateCell(selectedCells[0], { fontSize: parseInt(v) })}
                >
                  <SelectTrigger className="w-16 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(s => (
                      <SelectItem key={s} value={String(s)}>{s}pt</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedCell?.fontFamily || 'Arial'}
                  onValueChange={(v) => updateCell(selectedCells[0], { fontFamily: v })}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="h-6 w-px bg-gray-300" />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedCells.length === 1) {
                      deleteCell(selectedCells[0]);
                      setSelectedCells([]);
                    }
                  }}
                  title="Effacer la cellule"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}

            <div className="ml-auto text-xs text-gray-500">
              {selectedCells.length > 0
                ? `${selectedCells.length} cellule(s) sélectionnée(s)`
                : 'Double-clic pour éditer · Shift+clic pour multi-sélection'
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template name edit */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            className="text-sm"
            placeholder="Nom du template"
          />
        </div>
        <div className="flex-1">
          <Input
            value={template.description}
            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
            className="text-sm"
            placeholder="Description"
          />
        </div>
      </div>

      {/* Grid */}
      {renderGrid()}

      {/* Cell Edit Dialog */}
      <Dialog open={!!editingCell} onOpenChange={(open) => !open && setEditingCell(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Éditer la cellule {editingCell}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Content type */}
            <div>
              <Label>Type de contenu</Label>
              <Select
                value={cellEditData.type || 'text'}
                onValueChange={(v) => setCellEditData({ ...cellEditData, type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte / Variable</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cellEditData.type === 'image' ? (
              <div className="space-y-3">
                {/* Current image preview */}
                {cellEditData.imageUrl && !['{{logo}}', '{{model_image}}', '{{model_plan}}'].includes(cellEditData.imageUrl) && (
                  <div className="border rounded p-2 flex items-center justify-center bg-gray-50">
                    <img src={cellEditData.imageUrl} alt="Preview" className="max-h-24 object-contain" />
                  </div>
                )}
                {cellEditData.imageUrl === '{{logo}}' && (
                  <div className="border rounded p-2 text-center text-sm text-gray-500 bg-yellow-50">
                    🏢 Logo du site (variable)
                  </div>
                )}
                {cellEditData.imageUrl === '{{model_image}}' && (
                  <div className="border rounded p-2 text-center text-sm text-gray-500 bg-blue-50">
                    🏠 Photo du modèle (variable)
                  </div>
                )}
                {cellEditData.imageUrl === '{{model_plan}}' && (
                  <div className="border rounded p-2 text-center text-sm text-gray-500 bg-green-50">
                    📐 Plan du modèle (variable)
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={cellEditData.imageUrl === '{{logo}}' ? 'default' : 'outline'}
                    onClick={() => setCellEditData({ ...cellEditData, imageUrl: '{{logo}}' })}
                  >
                    🏢 Logo du site
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={cellEditData.imageUrl === '{{model_image}}' ? 'default' : 'outline'}
                    onClick={() => setCellEditData({ ...cellEditData, imageUrl: '{{model_image}}' })}
                  >
                    🏠 Photo du modèle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={cellEditData.imageUrl === '{{model_plan}}' ? 'default' : 'outline'}
                    onClick={() => setCellEditData({ ...cellEditData, imageUrl: '{{model_plan}}' })}
                  >
                    📐 Plan du modèle
                  </Button>
                  <label>
                    <Button type="button" size="sm" variant="outline" asChild disabled={uploadingImage}>
                      <span>
                        {uploadingImage ? '⏳ Upload...' : '📤 Uploader'}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (galleryImages.length === 0) loadGalleryImages();
                    }}
                  >
                    🖼 Galerie
                  </Button>
                  {cellEditData.imageUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-red-500"
                      onClick={() => setCellEditData({ ...cellEditData, imageUrl: '' })}
                    >
                      ✕ Retirer
                    </Button>
                  )}
                </div>

                {/* Gallery picker */}
                {galleryImages.length > 0 && (
                  <div>
                    <Label className="mb-1 block text-xs">Choisir depuis la galerie</Label>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                      {galleryLoading ? (
                        <p className="col-span-4 text-center text-xs text-gray-400 py-4">Chargement...</p>
                      ) : (
                        galleryImages.map((img: any) => {
                          const imgPath = img.file_path ? ('/' + img.file_path.replace(/^\//, '')) : '';
                          return (
                            <div
                              key={img.id}
                              className={`border rounded cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all ${cellEditData.imageUrl === imgPath ? 'ring-2 ring-orange-500' : ''}`}
                              onClick={() => setCellEditData({ ...cellEditData, imageUrl: imgPath })}
                            >
                              <img src={imgPath} alt="" className="w-full h-16 object-cover rounded" />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Inline formatting toolbar */}
                <div>
                  <Label>Contenu</Label>
                  <div className="flex items-center gap-1 mb-2 mt-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => { document.execCommand('bold'); editorRef.current?.focus(); }} title="Gras">
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { document.execCommand('italic'); editorRef.current?.focus(); }} title="Italique">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { document.execCommand('underline'); editorRef.current?.focus(); }} title="Souligné">
                      <Underline className="h-4 w-4" />
                    </Button>
                  </div>
                  <div
                    key={editingCell || ''}
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[80px] max-h-[200px] overflow-y-auto border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    style={{
                      fontFamily: cellEditData.fontFamily || 'Arial',
                      color: cellEditData.color || '#000',
                    }}
                    dangerouslySetInnerHTML={{ __html: cellEditData.content || '' }}
                    onBlur={(e) => setCellEditData({ ...cellEditData, content: e.currentTarget.innerHTML })}
                  />
                </div>

                {/* Variables */}
                <div>
                  <Label className="mb-2 block">Variables disponibles</Label>
                  <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-3">
                    {VARIABLES.map((group) => (
                      <div key={group.group}>
                        <p className="text-xs font-semibold text-gray-500 mb-1">{group.group}</p>
                        <div className="flex flex-wrap gap-1">
                          {group.items.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                              onClick={() => {
                                if (editorRef.current) {
                                  editorRef.current.focus();
                                  document.execCommand('insertHTML', false, v.key);
                                }
                              }}
                              title={v.label}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Formatting */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">Formatage</Label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Taille</Label>
                  <Select
                    value={String(cellEditData.fontSize || 10)}
                    onValueChange={(v) => setCellEditData({ ...cellEditData, fontSize: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZES.map(s => (
                        <SelectItem key={s} value={String(s)}>{s}pt</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Police</Label>
                  <Select
                    value={cellEditData.fontFamily || 'Arial'}
                    onValueChange={(v) => setCellEditData({ ...cellEditData, fontFamily: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Alignement</Label>
                  <Select
                    value={cellEditData.textAlign || 'left'}
                    onValueChange={(v) => setCellEditData({ ...cellEditData, textAlign: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Gauche</SelectItem>
                      <SelectItem value="center">Centre</SelectItem>
                      <SelectItem value="right">Droite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Couleur de fond</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={cellEditData.bgColor || '#ffffff'}
                      onChange={(e) => setCellEditData({ ...cellEditData, bgColor: e.target.value })}
                      className="w-10 h-8 p-0 border-0"
                    />
                    <Input
                      value={cellEditData.bgColor || ''}
                      onChange={(e) => setCellEditData({ ...cellEditData, bgColor: e.target.value })}
                      placeholder="transparent"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Couleur du texte</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={cellEditData.color || '#000000'}
                      onChange={(e) => setCellEditData({ ...cellEditData, color: e.target.value })}
                      className="w-10 h-8 p-0 border-0"
                    />
                    <Input
                      value={cellEditData.color || ''}
                      onChange={(e) => setCellEditData({ ...cellEditData, color: e.target.value })}
                      placeholder="noir"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCell(null)}>Annuler</Button>
            <Button onClick={handleSaveCellEdit}>Appliquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Aperçu du template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Aperçu avec des données fictives. Les variables seront remplacées lors de la génération du PDF.
            </p>
            <div
              className="border rounded-lg p-4 bg-white shadow-inner mx-auto"
              style={{ width: '210mm', minHeight: '297mm', transform: 'scale(0.6)', transformOrigin: 'top center' }}
            >
              {/* Render a preview of the grid */}
              <table style={{ width: '190mm', borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: 'Arial', fontSize: '10pt' }}>
                <colgroup>
                  {Array.from({ length: template.col_count }, (_, c) => (
                    <col key={c} style={{ width: `${template.col_widths[c] || 19}mm` }} />
                  ))}
                </colgroup>
                <tbody>
                  {Array.from({ length: template.row_count }, (_, r) => {
                    const mergedMap = getMergedCellsMap();
                    return (
                      <tr key={r} style={{ height: `${template.row_heights[r] || 14}mm` }}>
                        {Array.from({ length: template.col_count }, (_, c) => {
                          const key = getCellKey(r, c);
                          if (mergedMap[key]) return null;
                          const cell = template.grid_data[key];
                          if (!cell) return <td key={key} style={{ border: '0.5pt solid #eee', padding: '2mm' }}></td>;
                          const colspan = cell.colspan || 1;
                          const rowspan = cell.rowspan || 1;
                          const style: React.CSSProperties = {
                            border: '0.5pt solid #ddd',
                            padding: '2mm',
                            fontWeight: cell.bold ? 'bold' : 'normal',
                            fontStyle: cell.italic ? 'italic' : 'normal',
                            textDecoration: cell.underline ? 'underline' : 'none',
                            fontSize: cell.fontSize ? `${cell.fontSize}pt` : '10pt',
                            fontFamily: cell.fontFamily || 'Arial',
                            textAlign: (cell.textAlign as any) || 'left',
                            backgroundColor: cell.bgColor || 'transparent',
                            color: cell.color || 'inherit',
                            verticalAlign: 'middle',
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                          };

                          let content = cell.content || '';
                          if (cell.type === 'image') {
                            content = cell.imageUrl ? `[Image: ${cell.imageUrl}]` : '[Image]';
                          }

                          return (
                            <td
                              key={key}
                              style={style}
                              colSpan={colspan > 1 ? colspan : undefined}
                              rowSpan={rowspan > 1 ? rowspan : undefined}
                            >
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
