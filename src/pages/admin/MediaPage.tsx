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
  // Upload form
  const [uploadType, setUploadType] = useState<"model" | "plan">("model");
  const [uploadRefId, setUploadRefId] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);

  // Gallery (existing images)
  const [galleryType, setGalleryType] = useState<"model" | "plan">("model");
  const [galleryRefId, setGalleryRefId] = useState<string>("");
  const [items, setItems] = useState<ApiRow[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  function toPublicUrl(filePath: string) {
    return "/" + String(filePath || "").replace(/^\/+/, "");
  }

  function buildListUrl(type: "model" | "plan", refId: number) {
    if (type === "model") return `/api/media.php?action=model_list&model_id=${refId}`;
    return `/api/media.php?action=plan_list&plan_id=${refId}`;
  }

  function buildUploadUrl(type: "model" | "plan", refId: number) {
    if (type === "model") return `/api/media.php?action=model_upload&model_id=${refId}`;
    return `/api/media.php?action=plan_upload&plan_id=${refId}`;
  }

  function buildDeleteUrl(type: "model" | "plan", id: number) {
    if (type === "model") return `/api/media.php?action=model_delete&id=${id}`;
    return `/api/media.php?action=plan_delete&id=${id}`;
  }

  async function loadGallery() {
    setGalleryError(null);

    const id = Number(galleryRefId || 0);
    if (!id) {
      setItems([]);
      return;
    }

    setGalleryLoading(true);
    try {
      const r = await fetch(buildListUrl(galleryType, id), {
        method: "GET",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Erreur liste media");

      const arr = Array.isArray(j?.data?.items) ? (j.data.items as ApiRow[]) : [];
      setItems(arr);
    } catch (e: any) {
      setGalleryError(e?.message || "Erreur");
      setItems([]);
    } finally {
      setGalleryLoading(false);
    }
  }

  // Auto reload gallery when filter changes
  useEffect(() => {
    loadGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryType, galleryRefId]);

  async function uploadOne(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);
    setUploadOk(null);

    const id = Number(uploadRefId || 0);
    if (!id) return setUploadError("Indique l'ID (modèle ou plan).");
    if (!uploadFile) return setUploadError("Choisis un fichier image.");

    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile); // IMPORTANT: media.php attend "file"

      const r = await fetch(buildUploadUrl(uploadType, id), {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Upload failed");

      setUploadFile(null);
      setUploadOk("Image uploadée ✅");

      // Option pratique : si la galerie est sur le même type+id, on refresh
      if (galleryType === uploadType && Number(galleryRefId || 0) === id) {
        await loadGallery();
      }
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed");
    } finally {
      setUploadLoading(false);
    }
  }

  async function deleteOne(id: number) {
    if (!confirm("Supprimer cette image ?")) return;
    setGalleryError(null);

    try {
      const r = await fetch(buildDeleteUrl(galleryType, id), {
        method: "POST",
        credentials: "include",
      });

      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Delete failed");

      await loadGallery();
    } catch (e: any) {
      setGalleryError(e?.message || "Delete failed");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Gestion Photos</h1>

      {/* =========================
          BLOCK 1: UPLOAD
         ========================= */}
      <section
        style={{
          background: "white",
          padding: 16,
          borderRadius: 12,
          marginBottom: 18,
          border: "2px solid #11182710",
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>➕ Ajouter une image</h2>

        <form onSubmit={uploadOne} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label>
              Type&nbsp;
              <select value={uploadType} onChange={(e) => setUploadType(e.target.value as any)}>
                <option value="model">Modèle</option>
                <option value="plan">Plan</option>
              </select>
            </label>

            <label>
              ID&nbsp;
              <input
                value={uploadRefId}
                onChange={(e) => setUploadRefId(e.target.value)}
                placeholder={uploadType === "model" ? "model_id (ex: 12)" : "plan_id (ex: 7)"}
                style={{ width: 180 }}
              />
            </label>

            <label>
              Image&nbsp;
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </label>

            <button type="submit" disabled={uploadLoading}>
              {uploadLoading ? "Upload..." : "Uploader"}
            </button>
          </div>

          {uploadError && <div style={{ color: "red" }}>{uploadError}</div>}
          {uploadOk && <div style={{ color: "green" }}>{uploadOk}</div>}

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Astuce : pour voir l’image ensuite, mets le même Type + ID dans “Images existantes”.
          </div>
        </form>
      </section>

      {/* =========================
          BLOCK 2: GALLERY
         ========================= */}
      <section
        style={{
          background: "white",
          padding: 16,
          borderRadius: 12,
          border: "2px solid #11182710",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>🖼️ Images existantes</h2>
          <button onClick={loadGallery} disabled={galleryLoading || !galleryRefId}>
            {galleryLoading ? "Chargement..." : "Rafraîchir"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Type&nbsp;
            <select value={galleryType} onChange={(e) => setGalleryType(e.target.value as any)}>
              <option value="model">Modèle</option>
              <option value="plan">Plan</option>
            </select>
          </label>

          <label>
            ID&nbsp;
            <input
              value={galleryRefId}
              onChange={(e) => setGalleryRefId(e.target.value)}
              placeholder={galleryType === "model" ? "model_id (ex: 12)" : "plan_id (ex: 7)"}
              style={{ width: 180 }}
            />
          </label>

          <span style={{ fontSize: 12, opacity: 0.7 }}>
            (Sélectionne Type + ID pour afficher la galerie)
          </span>
        </div>

        {galleryError && <div style={{ marginTop: 10, color: "red" }}>{galleryError}</div>}

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
                  {galleryType} #{galleryType === "model" ? it.model_id : it.plan_id} — ID image: {it.id}
                </div>
                <div style={{ fontSize: 12, wordBreak: "break-all" }}>{it.file_path}</div>
                <button style={{ marginTop: 8 }} onClick={() => deleteOne(it.id)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}

          {!galleryLoading && galleryRefId && items.length === 0 && <div>Aucune image pour cet ID.</div>}
          {!galleryRefId && <div>Entre un ID pour afficher les images.</div>}
        </div>
      </section>
    </div>
  );
}
