import React, { useEffect, useState } from "react";
import { Settings, Image } from "lucide-react";
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
  site_logo_url?: string;
  site_slogan?: string;
}

const defaults: SiteSettings = {
  site_under_construction: "true",
  under_construction_message:
    "🚧 Page en construction — merci de revenir ultérieurement. | Page under construction - please come back later",
  site_logo_url: "",
  site_slogan: "container home - swimming-pools",
};

export default function SiteSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaults);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const s = await api.getSettings("site");
        setSettings({ ...defaults, ...(s || {}) });
      } catch (err: any) {
        toast({
          title: "Erreur",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await api.updateSettingsBulk([
        {
          key: "site_under_construction",
          value: settings.site_under_construction,
          group: "site",
        },
        {
          key: "under_construction_message",
          value: settings.under_construction_message || "",
          group: "site",
        },
        {
          key: "site_logo_url",
          value: settings.site_logo_url || "",
          group: "site",
        },
        {
          key: "site_slogan",
          value: settings.site_slogan || "",
          group: "site",
        },
      ]);

      toast({ title: "Succès", description: "Paramètres enregistrés." });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
          <p className="text-gray-600">Paramètres publics du site</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {loading ? (
            <div className="text-gray-600">Chargement…</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <Label className="text-base">Site en construction</Label>
                  <p className="text-sm text-gray-600">
                    Affiche un bandeau sous le menu sur le site public.
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

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={settings.under_construction_message}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      under_construction_message: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo (URL)</Label>
                <Input
                  value={settings.site_logo_url || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      site_logo_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
                {settings.site_logo_url && (
                  <img
                    src={settings.site_logo_url}
                    alt="Logo preview"
                    className="mt-2 h-16"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Slogan</Label>
                <Input
                  value={settings.site_slogan || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      site_slogan: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
