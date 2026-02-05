import React, { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SiteSettings {
  site_under_construction: string;
  under_construction_message: string;
  site_logo: string;
  pdf_logo: string;
  site_slogan: string;
  vat_rate: string;
}

const defaultValues: SiteSettings = {
  site_under_construction: "false",
  under_construction_message: "",
  site_logo: "",
  pdf_logo: "",
  site_slogan: "container home - swimming-pools",
  vat_rate: "15",
};

export default function SiteSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteSettings>(defaultValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.getSettings("site");
        setSettings({ ...defaultValues, ...(result || {}) });
      } catch (err: any) {
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await api.updateSettingsBulk([
        { key: "site_under_construction", value: settings.site_under_construction, group: "site" },
        { key: "under_construction_message", value: settings.under_construction_message, group: "site" },
        { key: "site_logo", value: settings.site_logo, group: "site" },
        { key: "pdf_logo", value: settings.pdf_logo, group: "site" },
        { key: "site_slogan", value: settings.site_slogan, group: "site" },
        { key: "vat_rate", value: settings.vat_rate, group: "site" },
      ]);
      toast({ title: "Succès", description: "Paramètres enregistrés." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file); // doit être "file", pas "logo"

    setUploading(true);
    try {
      const response = await fetch("/api/upload_logo.php", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setSettings((prev) => ({
          ...prev,
          site_logo: result.menu_logo_url,
          pdf_logo: result.pdf_logo_url,
        }));
        toast({ title: "Logo mis à jour" });
      } else {
        throw new Error(result.error || "Upload échoué");
      }
    } catch (err: any) {
      toast({ title: "Erreur Upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const enabled = settings.site_under_construction === "true";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A365D]">Site</h1>
          <p className="text-gray-600">Maintenance, logo, slogan et message</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {loading ? (
            <div className="text-gray-600">Chargement…</div>
          ) : (
            <>
              {/* Maintenance */}
              <div className="flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <Label className="text-base">Site en construction</Label>
                  <p className="text-sm text-gray-600">
                    Affiche un bandeau sur le site public
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      site_under_construction: v ? "true" : "false",
                    }))
                  }
                />
              </div>

              {/* Message */}
              <div>
                <Label>Message</Label>
                <Textarea
                  rows={3}
                  value={settings.under_construction_message}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      under_construction_message: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Slogan */}
              <div>
                <Label>Slogan</Label>
                <Input
                  value={settings.site_slogan}
                  onChange={(e) => setSettings({ ...settings, site_slogan: e.target.value })}
                />
              </div>

              {/* TVA Rate */}
              <div>
                <Label>Taux de TVA (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.vat_rate}
                  onChange={(e) => setSettings({ ...settings, vat_rate: e.target.value })}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Taux de TVA appliqué pour calculer les prix TTC (ex: 15 pour Maurice)
                </p>
              </div>

              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Logo du site</Label>
                {settings.site_logo && (
                  <img
                    src={settings.site_logo}
                    alt="Logo actuel"
                    className="h-12 mb-2 border rounded bg-white"
                  />
                )}
                <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                <p className="text-sm text-gray-500">
                  Le logo sera redimensionné pour l’entête et les documents PDF.
                </p>
              </div>

              {/* Enregistrer */}
              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
