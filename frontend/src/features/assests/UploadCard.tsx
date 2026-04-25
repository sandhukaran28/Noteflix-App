"use client";
import { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api";

export default function UploadCard({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [encodeProfile, setEncodeProfile] = useState("balanced");
  const [dialogue, setDialogue] = useState("solo");

  const onUpload = async () => {
    if (!file) return;
    setBusy(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("encodeProfile", encodeProfile);
    fd.append("dialogue", dialogue);
    try {
      const res: any = await api("/assets", { method: "POST", token, form: true, body: fd });
      setMsg(res?.jobId ? `Uploaded — job ${res.jobId.slice(0, 8)} started` : "Uploaded");
      setFile(null);
      window.dispatchEvent(new CustomEvent("assets:refresh"));
      window.dispatchEvent(new CustomEvent("jobs:refresh"));
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Upload PDF"
        subtitle="Video generation starts automatically after upload"
      />
      <CardBody className="grid gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Select
          label="Encode profile"
          value={encodeProfile}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEncodeProfile(e.target.value)}
        >
          <option value="balanced">balanced (1080p)</option>
          <option value="heavy">heavy (1440p, 2-pass)</option>
          <option value="insane">insane (4K, 2-pass)</option>
        </Select>
        <Select
          label="Voice"
          value={dialogue}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDialogue(e.target.value)}
        >
          <option value="solo">Solo narrator</option>
          <option value="duet">Duet (Alex &amp; Sam)</option>
        </Select>
        <div className="flex items-center gap-2">
          <Button onClick={onUpload} disabled={!file || busy}>
            {busy ? "Uploading…" : "Upload &amp; generate"}
          </Button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </CardBody>
    </Card>
  );
}
