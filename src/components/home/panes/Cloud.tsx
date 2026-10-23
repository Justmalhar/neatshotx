import { Caption, Section } from "../form";
import type { PaneProps } from "./types";

export default function Cloud({ s, set }: PaneProps) {
  return (
    <>
      <Section label="Endpoint:">
        <input className="input w-72" placeholder="https://share.example.com/api/upload" value={s.upload_url} onChange={(e) => set("upload_url", e.target.value)} />
      </Section>
      <Section label="Form field:">
        <input className="input w-40" value={s.upload_field} onChange={(e) => set("upload_field", e.target.value)} />
        <Caption>Name of the multipart file part.</Caption>
      </Section>
      <Section label="Authorization header:">
        <input className="input w-72" type="password" autoComplete="off" value={s.upload_headers.Authorization ?? ""}
          onChange={(e) => set("upload_headers", { ...s.upload_headers, Authorization: e.target.value })} />
        <Caption>Sent as-is, e.g. Bearer &lt;token&gt;.</Caption>
      </Section>
      <Section>
        <Caption>Files are POSTed as multipart form-data to your endpoint (a self-hosted Zipline, XBackBone, or a Cloudflare Worker + R2). The first URL in the response is copied to the clipboard.</Caption>
      </Section>
    </>
  );
}
