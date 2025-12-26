import React, { useEffect, useState } from "react";

type ApiRow = {
  id: number;
  model_id?: number;
  plan_id?: number;
  file_path: string;
  is_primary?: number | boolean;
  sort_order?: number;
  created_at?: string;
};

export default function MediaPage() {
  const [type, setType] = useState<"model" | "plan">("model");
  const [refId, setRefId] = useState<string>(""); // model_id ou plan_id
  const [file, setFile] = useState<File | null>(null);

  const [items, setItems] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildListUrl() {
    const id = Number(refId || 0);
    if (type === "model") return `/api/media.php?action=model_list&model_id=${id}`;
    return `/api/media.php?action=plan_list&plan_id=${id}`;
  }

  function buildUploadUrl() {
    const id = Number(refId || 0);
    if (type === "model") return `/api/media.php?action=model_upload&model_id=${id}`;
    return `/api/media.php?action=plan_upload&plan_id=${id}`;
  }

  function buildDeleteUrl(id: number) {
    if (type === "model") return `/api/media.php?action=model_delete&id=${id}`;
    return `/api/media.php?action=plan_delete&id=${id}`;
  }

  function toPublicUrl(filePath: string) {
    return "/" + String(filePath || "").replace(/^\/+/, "");
  }

  async function loadList() {
    setError(null);

    const id = Number(refId || 0);
    if (!id) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(buildListUrl(), {
        method: "GET",
        credentials: "include",
      });

      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Erreur liste media");

      const arr = Array.isArray(j?.data?.items) ? (j.data.items as ApiRow[]) : [];
      setItems(arr);
    } catch (e: any) {
      setError(e?.message || "Erreur");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // charge automatiquement quand type/refId changent
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, refId]);

  async function uploadOne(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const id = Number(refId || 0);
    if (!id) return setError("Indique l'ID (modèle ou plan).");
    if (!file) return setError("Choisis un fichier image.");

    const fd = new FormData();
    fd.append("file", file); // IMPORTANT: media.php attend "file"

    const r = await fetch(buildUploadUrl(), {
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
    if (!confirm("Supprimer cette image ?")) return;
    setError(null);

    const r = await fetch(buildDeleteUrl(id), {
      method: "POST",
      credentials: "include",
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
              placeholder={type === "model" ? "model_id (ex: 12)" : "plan_id (ex: 7)"}
              style={{ width: 160 }}
            />
          </label>

          <label>
            Image&nbsp;
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          <button type="submit" disabled={loading}>
            Uploader
          </button>

          <button type="button" onClick={loadList} disabled={loading || !refId}>
            {loading ? "Chargement..." : "Rafraîchir"}
          </button>
        </div>

        {error && <div style={{ color: "red" }}>{error}</div>}
      </form>

      <div style={{ background: "white", padding: 16, borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>
          Images {refId ? `(${type} #${refId})` : "(choisir un ID)"}
        </h2>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((it) => (
            <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ aspectRatio: "4/3", background: "#f3f4f6" }}>
                <img
                  src={toPublicUrl(it.file_path)}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                />
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {type} #{type === "model" ? it.model_id : it.plan_id} — ID image: {it.id}
                </div>
                <div style={{ fontSize: 12, wordBreak: "break-all" }}>{it.file_path}</div>
                <button style={{ marginTop: 8 }} onClick={() => deleteOne(it.id)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}

          {!loading && refId && items.length === 0 && <div>Aucune image pour cet ID.</div>}
          {!refId && <div>Entre un ID (modèle ou plan) pour afficher les images.</div>}
        </div>
      </div>
    </div>
  );
}
