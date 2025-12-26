import React, { useEffect, useState } from "react";

type MediaItem = {
  id: number;
  type: "model" | "plan";
  ref_id: number;
  file: string; // ex: "uploads/models/12/photo1.jpg"
  url: string;  // url complète renvoyée par l’API
  is_main?: boolean;
  created_at?: string;
};

const MediaPage: React.FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // formulaire
  const [type, setType] = useState<"model" | "plan">("model");
  const [refId, setRefId] = useState<string>(""); // id modèle/plan
  const [file, setFile] = useState<File | null>(null);

  async function loadList() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/media.php?action=list`, {
        method: "GET",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Erreur liste media");
      setItems((j.data || []) as MediaItem[]);
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function uploadOne(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!refId) return setError("Indique l'ID (modèle ou plan).");
    if (!file) return setError("Choisis un fichier image.");

    const fd = new FormData();
    fd.append("type", type);              // "model" | "plan"
    fd.append("ref_id", String(refId));   // ex: 12
    fd.append("image", file);             // IMPORTANT: name "image"

    const r = await fetch(`/api/media.php?action=upload`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    const j = await r.json().catch(() => ({} as any));
    if (!r.ok || !j?.success) {
      setError(j?.error || "Upload failed");
      return;
    }

    setFile(null);
    await loadList();
  }

  async function deleteOne(id: number) {
    if (!window.confirm("Supprimer cette image ?")) return;
    setError(null);

    const r = await fetch(`/api/media.php?action=delete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const j = await r.json().catch(() => ({} as any));
    if (!r.ok || !j?.success) {
      setError(j?.error || "Delete failed");
      return;
    }

    await loadList();
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Gestion Photos</h1>

      {/* Upload */}
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
            <select value={type} onChange={(e) => setType(e.target.value as "model" | "plan")}>
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
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <button type="submit">Uploader</button>
        </div>

        {error && <div style={{ color: "red" }}>{error}</div>}
      </form>

      {/* Liste */}
      <div style={{ background: "white", padding: 16, borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18 }}>Images</h2>
          <button onClick={loadList} disabled={loading}>
            {loading ? "Chargement..." : "Rafraîchir"}
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((it) => (
            <div
              key={it.id}
              style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}
            >
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
                <button style={{ marginTop: 8 }} onClick={() => deleteOne(it.id)}>
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
};

export default MediaPage;
