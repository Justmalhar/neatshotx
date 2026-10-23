import Group from "../ui/Group";
import Row from "../ui/Row";
import type { PaneProps } from "./types";

export default function Cloud({ s, set }: PaneProps) {
  return (
    <Group
      title="Upload endpoint"
      footer="Files are POSTed as multipart form-data to your endpoint (a self-hosted Zipline, XBackBone, or a Cloudflare Worker + R2). The first URL in the response is copied to the clipboard."
    >
      <Row label="Endpoint">
        <input className="input w-72" placeholder="https://share.example.com/api/upload" value={s.upload_url} onChange={(e) => set("upload_url", e.target.value)} />
      </Row>
      <Row label="Form field" caption="Name of the multipart file part">
        <input className="input w-40" value={s.upload_field} onChange={(e) => set("upload_field", e.target.value)} />
      </Row>
      <Row label="Authorization header" caption="Sent as-is, e.g. Bearer <token>">
        <input className="input w-72" type="password" autoComplete="off" value={s.upload_headers.Authorization ?? ""}
          onChange={(e) => set("upload_headers", { ...s.upload_headers, Authorization: e.target.value })} />
      </Row>
    </Group>
  );
}
