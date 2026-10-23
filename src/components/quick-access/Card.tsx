import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Download, Film, Pencil, Pin, Play, UploadCloud, X } from "lucide-react";
import { api, fileName, fileSrc, isGif, isVideo } from "../../lib/api";
import { spring, materialize } from "../../lib/motion";
import { useAutoClose } from "./useAutoClose";
import { useSwipeDismiss } from "./useSwipeDismiss";

export const CARD_H = 168;

type Props = {
  path: string;
  rev: number;
  side: "left" | "right";
  autoCloseSecs: number;
  closeAfterDrag: boolean;
  closeAfterUpload: boolean;
  onClose: () => void;
  onReplace: (p: string) => void;
};

export default function Card({ path, rev, side, autoCloseSecs, closeAfterDrag, closeAfterUpload, onClose, onReplace }: Props) {
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);
  const video = isVideo(path);
  const image = !video && !isGif(path);

  const flash = (text: string, err = false) => { setToast({ text, err }); setTimeout(() => setToast(null), err ? 2400 : 1300); };
  const run = async (f: () => Promise<unknown>, msg: string, after?: () => void) => {
    setBusy(true);
    try { await f(); flash(msg); after?.(); } catch (e) { flash(String(e), true); } finally { setBusy(false); }
  };

  const progress = useAutoClose(autoCloseSecs, hover || busy, onClose);
  const { x, bind } = useSwipeDismiss(side, onClose, () => {
    startDrag({ item: [path], icon: image ? path : "" }).then(() => closeAfterDrag && onClose()).catch(() => {});
  });

  const saveAs = async () => {
    const dest = await save({ defaultPath: fileName(path) });
    if (dest) await run(() => api.copyFile(path, dest), "Saved");
  };

  return (
    <motion.div
      {...bind}
      style={{ x, height: CARD_H, touchAction: "none" }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      className="group relative shrink-0 select-none overflow-hidden rounded-[16px] bg-black/20 shadow-[0_8px_24px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.18)]"
    >
      {video ? (
        <video src={fileSrc(path)} className="pointer-events-none h-full w-full object-cover" muted autoPlay loop />
      ) : (
        <img src={`${fileSrc(path)}?v=${rev}`} className="pointer-events-none h-full w-full object-cover" draggable={false} />
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[16px] ring-1 ring-inset ring-white/10" />
      {video && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center transition-opacity group-hover:opacity-0">
          <span className="mat-hud grid h-10 w-10 place-items-center rounded-full"><Play size={16} fill="currentColor" /></span>
        </div>
      )}

      <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/50 via-black/20 to-black/50 p-2 opacity-0 backdrop-blur-[3px] transition-opacity duration-150 group-hover:opacity-100">
        <div className="flex justify-between">
          <IconBtn title="Close" onClick={onClose}>
            {autoCloseSecs > 0 && (
              <svg viewBox="0 0 28 28" className="pointer-events-none absolute inset-0 -rotate-90">
                <motion.circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ pathLength: progress, opacity: 0.55 }} />
              </svg>
            )}
            <X size={14} />
          </IconBtn>
          <div className="flex gap-1">
            {image && <IconBtn title="Pin" onClick={() => api.openPin(path)}><Pin size={14} /></IconBtn>}
            {image && <IconBtn title="Annotate" onClick={() => { api.openEditor(path); onClose(); }}><Pencil size={14} /></IconBtn>}
            <IconBtn title="Upload & copy link" onClick={() => run(() => api.upload(path), "Link copied", closeAfterUpload ? () => setTimeout(onClose, 900) : undefined)}><UploadCloud size={14} /></IconBtn>
          </div>
        </div>
        <div className="flex justify-center gap-1.5">
          {image && <PillBtn onClick={() => run(() => api.copyImage(path), "Copied")}><Copy size={13} />Copy</PillBtn>}
          {video && <PillBtn onClick={() => run(async () => onReplace(await api.convertToGif(path)), "GIF ready")}><Film size={13} />GIF</PillBtn>}
          <PillBtn onClick={saveAs}><Download size={13} />Save</PillBtn>
        </div>
      </div>

      <AnimatePresence>
        {(toast || busy) && (
          <motion.div {...materialize} transition={spring.ui}
            className={`mat-hud pointer-events-none absolute left-1/2 top-1/2 flex max-w-[90%] -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${toast?.err ? "text-red-300" : ""}`}>
            {busy ? "Working…" : <>{!toast?.err && <Check size={13} />}<span className="truncate">{toast?.text}</span></>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const pill = "mat-hud relative grid place-items-center text-white";

function IconBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <motion.button whileTap={{ scale: 0.9 }} transition={spring.press} {...(props as object)} className={`${pill} h-7 w-7 rounded-full`} />;
}

function PillBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <motion.button whileTap={{ scale: 0.94 }} transition={spring.press} {...(props as object)} className={`${pill} h-7 grid-flow-col gap-1.5 rounded-full px-3 text-xs font-medium`} />;
}
