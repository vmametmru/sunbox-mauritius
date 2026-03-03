import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Package, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Model {
  id: number;
  name: string;
  type: 'container' | 'pool';
  base_price: number;
  calculated_base_price?: number;
  surface_m2: number;
  bedrooms?: number;
  image_url?: string;
}

interface Override {
  model_id: number;
  price_adjustment: number;
  is_enabled: boolean;
}

// We get our user ID from the pro session
async function getProUserId(): Promise<number> {
  const r = await fetch('/api/pro_auth.php?action=me', { credentials: 'include' });
  const j = await r.json().catch(() => ({}));
  return j?.data?.id ?? 0;
}

export default function ProModelsOverridePage() {
  const [models, setModels] = useState<Model[]>([]);
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [userId, setUserId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const uid = await getProUserId();
        setUserId(uid);
        const [modelsData, overridesData] = await Promise.all([
          api.getModels(undefined, true),
          uid ? api.getProModelOverrides(uid) : Promise.resolve([]),
        ]);
        setModels(Array.isArray(modelsData) ? modelsData : []);
        const ovMap: Record<number, Override> = {};
        (Array.isArray(overridesData) ? overridesData : []).forEach((ov: any) => {
          ovMap[Number(ov.model_id)] = {
            model_id: Number(ov.model_id),
            price_adjustment: Number(ov.price_adjustment),
            is_enabled: Boolean(Number(ov.is_enabled)),
          };
        });
        setOverrides(ovMap);
      } catch (err: any) {
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getOverride = (modelId: number): Override =>
    overrides[modelId] ?? { model_id: modelId, price_adjustment: 0, is_enabled: true };

  const updateOverrideLocal = (modelId: number, patch: Partial<Override>) => {
    setOverrides((prev) => ({
      ...prev,
      [modelId]: { ...getOverride(modelId), ...patch },
    }));
  };

  const saveOverride = async (modelId: number) => {
    if (!userId) return;
    const ov = getOverride(modelId);
    try {
      setSaving(modelId);
      await api.setProModelOverride({
        user_id: userId,
        model_id: modelId,
        price_adjustment: ov.price_adjustment,
        is_enabled: ov.is_enabled,
      });
      toast({ title: 'Enregistré' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const getBasePrice = (model: Model) =>
    Number(model.calculated_base_price ?? model.base_price ?? 0);

  const getEffectivePrice = (model: Model) => {
    const ov = getOverride(model.id);
    return Math.max(0, getBasePrice(model) + ov.price_adjustment);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-MU').format(Math.round(price)) + ' Rs';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Modèles</h1>
        <p className="text-gray-500 mt-1">
          Ajustez les prix et activez/désactivez les modèles sur votre site.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun modèle disponible.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {models.map((model) => {
            const ov = getOverride(model.id);
            const basePrice = getBasePrice(model);
            const effectivePrice = getEffectivePrice(model);
            const isSaving = saving === model.id;

            return (
              <Card
                key={model.id}
                className={`transition-opacity ${ov.is_enabled ? '' : 'opacity-60'}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Model info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {model.image_url ? (
                        <img
                          src={model.image_url}
                          alt={model.name}
                          className="h-14 w-auto max-w-[56px] object-contain rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{model.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={model.type === 'container' ? 'default' : 'secondary'} className="text-xs">
                            {model.type === 'container' ? 'Container' : 'Piscine'}
                          </Badge>
                          {!ov.is_enabled && (
                            <Badge variant="outline" className="text-xs text-gray-500">Masqué</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Prix Sunbox: {formatPrice(basePrice)}
                          {ov.price_adjustment !== 0 && (
                            <span className={`ml-2 font-medium ${ov.price_adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {ov.price_adjustment > 0 ? '+' : ''}{formatPrice(ov.price_adjustment)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Enable/Disable */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={ov.is_enabled}
                          onCheckedChange={(checked) => updateOverrideLocal(model.id, { is_enabled: checked })}
                        />
                        <span className="text-sm text-gray-600">
                          {ov.is_enabled ? 'Visible' : 'Masqué'}
                        </span>
                      </div>

                      {/* Price adjustment */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 whitespace-nowrap">Ajustement:</span>
                        <Input
                          type="number"
                          step="100"
                          className="w-28 h-8 text-sm"
                          value={ov.price_adjustment}
                          onChange={(e) => updateOverrideLocal(model.id, { price_adjustment: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">Rs</span>
                      </div>

                      {/* Effective price */}
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Prix final</p>
                        <p className="font-semibold text-orange-600">{formatPrice(effectivePrice)}</p>
                      </div>

                      {/* Save */}
                      <Button
                        size="sm"
                        onClick={() => saveOverride(model.id)}
                        disabled={isSaving}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-700">
            <strong>Comment ça fonctionne :</strong> Les modèles masqués n'apparaîtront pas sur votre site.
            L'ajustement de prix est ajouté (ou soustrait si négatif) au prix Sunbox.
            Ces réglages s'appliquent automatiquement à votre site déployé.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
