import React, { useEffect, useState } from "react";

type MediaItem = {
  id: number;
  type: "model" | "plan";
  ref_id: number;
  file: string;
  url: string;
  is_main?: boolean;
  created_at?: string;
};

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // formulaire
  const [type, setType] = useState<"model" | "plan">("model");
  const [refId, setRefId] = useState<string>(""); // id modèle/plan
  const [file, setFile] = useState<File | null>(null);

  function normalizeItems(j: any): MediaItem[] {
    const candidate = j?.data?.items ?? j?.data ?? j?.items ?? [];
    return Array.isArray(candidate) ? candidate : [];
  }

  async function loadList() {
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({ action: "list", type });
      if (refId) qs.set("ref_id", String(refId));

      const r = await fetch(`/api/media.php?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Erreur liste media");

      setItems(normalizeItems(j));
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadOne(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!refId) return setError("Indique l'ID (modèle ou plan).");
    if (!file) return setError("Choisis un fichier image.");

    const fd = new FormData();
    fd.append("type", type);
    fd.append("ref_id", String(refId));
    fd.append("image", file); // backend accepte image (et parfois file)

    const r = await fetch(`/api/media.php?action=upload`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.success) {
      setError(j?.error || "Upload failed");
      return;
    }

    setFile(null);
    await loadList();
  }

  async function deleteOne(id: number, itemType: "model" | "plan") {
    if (!confirm("Supprimer cette image ?")) return;
    setError(null);

    const r = await fetch(`/api/media.php?action=delete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type: itemType }),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.success) {
      setError(j?.error || "Delete failed");
      return;
    }

    await loadList();
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Gestion Photos</h1>

      <form
        onSubmit={uploadOne}
        style={{
          background: "white",
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label>
            Type&nbsp;
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="model">Modèle</option>
              <option value="plan">Plan</option>
            </select>
          </label>

          <label>
            ID&nbsp;
            <input
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              placeholder="ex: 12"
              style={{ width: 120 }}
            />
          </label>

          <label>
            Image&nbsp;
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          <button type="submit">Uploader</button>
          <button type="button" onClick={loadList} disabled={loading}>
            {loading ? "Chargement..." : "Rafraîchir"}
          </button>
        </div>

        {error && <div style={{ color: "red" }}>{error}</div>}
      </form>

      <div style={{ background: "white", padding: 16, borderRadius: 12 }}>
        <h2 style={{ fontSize: 18 }}>Images</h2>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((it) => (
            <div key={`${it.type}-${it.id}`} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ aspectRatio: "4/3", background: "#f3f4f6" }}>
                <img
                  src={it.url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                />
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {it.type} #{it.ref_id}
                </div>
                <div style={{ fontSize: 12, wordBreak: "break-all" }}>{it.file}</div>
                <button style={{ marginTop: 8 }} onClick={() => deleteOne(it.id, it.type)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          {!loading && items.length === 0 && <div>Aucune image.</div>}
        </div>
      </div>
    </div>
  );
}
