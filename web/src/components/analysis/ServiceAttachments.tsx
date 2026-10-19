"use client";
import { useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/api";
import { analysisApi } from "@/lib/maintenance-analysis";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
export type Attachment = {
  id: string;
  name: string;
  mime: string;
  bytes: number;
};
export function ServiceAttachments({
  id,
  files,
  role,
  userId,
  onUploaded,
}: {
  id: string;
  files: Attachment[];
  role: Role;
  userId: string;
  onUploaded: (file: Attachment, version: number) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (
        file.size > 10 * 1024 * 1024 ||
        !["application/pdf", "image/jpeg", "image/png"].includes(file.type)
      )
        throw new Error("Selecciona PDF, JPEG o PNG, hasta 10 MiB.");
      const content = await file.arrayBuffer(),
        digest = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", content)),
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      const identity = new TextEncoder().encode(
          `${id}:${file.name}:${file.type}:${digest}`,
        ),
        hash = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", identity)),
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      const key = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      const form = new FormData();
      form.append("file", file);
      const response = await authenticatedFetch(
        `/backend/analisis-mantenimiento/servicios-externos/${id}/adjuntos`,
        {
          method: "POST",
          headers: {
            "X-Role": role,
            "X-User-Id": userId,
            "Idempotency-Key": key,
          },
          body: form,
          signal: AbortSignal.timeout(30000),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message ??
            "No pudimos confirmar el adjunto. Reintenta con el mismo archivo.",
        );
      onUploaded(result.attachment, result.version);
      setFile(null);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "No se pudo conectar. Reintenta el mismo archivo."
          : e instanceof Error
            ? e.message
            : "No pudimos confirmar. Reintenta el mismo archivo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function download(file: Attachment) {
    setBusy(true);
    setError("");
    try {
      const { token } = await analysisApi<{ token: string }>(
        role,
        userId,
        `/servicios-externos/${id}/adjuntos/${file.id}/enlace`,
      );
      const response = await authenticatedFetch(
        `/backend/analisis-mantenimiento/servicios-externos/${id}/adjuntos/${file.id}?token=${encodeURIComponent(token)}`,
        { headers: { "X-Role": role, "X-User-Id": userId } },
      );
      if (!response.ok)
        throw new Error(
          "El enlace venció o el comprobante no está disponible.",
        );
      const url = URL.createObjectURL(await response.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos descargar el comprobante.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="analysis-form-section">
      <h3>Comprobantes privados</h3>
      <FormAlert>{error}</FormAlert>
      {files.map((f) => (
        <p key={f.id}>
          <Button
            variant="quiet"
            type="button"
            disabled={busy}
            onClick={() => void download(f)}
          >
            {f.name} · descargar
          </Button>
        </p>
      ))}
      {files.length < 5 && (
        <>
          <Field
            label="Adjuntar PDF, JPEG o PNG (hasta 10 MiB)"
            htmlFor="service-attachment"
          >
            <Input
              ref={picker}
              className="sr-only"
              tabIndex={-1}
              id="service-attachment"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Button
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={() => picker.current?.click()}
          >
            Seleccionar comprobante
          </Button>
          <p className="muted">{file?.name ?? "Ningún archivo seleccionado"}</p>
          <Button
            variant="secondary"
            type="button"
            disabled={!file || busy}
            onClick={() => void upload()}
          >
            {busy ? "Confirmando…" : "Guardar comprobante"}
          </Button>
        </>
      )}
    </section>
  );
}
