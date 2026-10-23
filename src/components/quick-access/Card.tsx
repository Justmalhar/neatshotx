import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { AnimatePresence, motion } from "motion/react";
import { Check, CloudUpload, Pencil, Pin, Play, Trash2, X } from "lucide-react";
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
  /** Saved automatically after capture → offer Delete instead of Save (CleanShot behavior). */
  autoSaved: boolean;
  onClose: () => void;
  onReplace: (p: string) => void;
};

export default function Card({ path, rev, side, autoCloseSecs, closeAfterDrag, closeAfterUpload, autoSaved, onClose, onReplace }: Props) {
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

      {/* CleanShot layout: corner actions + centered Copy / Save-or-Delete capsules over a dark scrim. */}
      <div className="absolute inset-0 bg-[rgba(18,18,20,0.58)] opacity-0 backdrop-blur-[2px] transition-opacity duration-150 group-hover:opacity-100">
        <IconBtn title="Close" className="left-2 top-2" onClick={onClose}>
          {autoCloseSecs > 0 && (
            <svg viewBox="0 0 30 30" className="pointer-events-none absolute inset-0 -rotate-90">
              <motion.circle cx="15" cy="15" r="13.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ pathLength: progress, opacity: 0.5 }} />
            </svg>
          )}
          <X size={15} strokeWidth={2.6} />
        </IconBtn>
        {image && <IconBtn title="Pin to the screen" className="right-2 top-2" onClick={() => api.openPin(path)}><Pin size={14} strokeWidth={2.4} fill="currentColor" /></IconBtn>}
        {image && <IconBtn title="Annotate" className="bottom-2 left-2" onClick={() => { api.openEditor(path); onClose(); }}><Pencil size={14} strokeWidth={2.4} fill="currentColor" /></IconBtn>}
        <IconBtn title="Upload & copy link" className="bottom-2 right-2"
          onClick={() => run(() => api.upload(path), "Link copied", closeAfterUpload ? () => setTimeout(onClose, 900) : undefined)}>
          <CloudUpload size={15} strokeWidth={2.4} />
        </IconBtn>
        <div className="absolute inset-0 m-auto flex h-fit w-fit flex-col items-center gap-2">
          {image && <PillBtn onClick={() => run(() => api.copyImage(path), "Copied")}>Copy</PillBtn>}
          {video && <PillBtn onClick={() => run(async () => onReplace(await api.convertToGif(path)), "GIF ready")}>GIF</PillBtn>}
          {autoSaved
            ? <PillBtn title="Delete" onClick={() => run(() => api.deleteCapture(path), "Deleted", onClose)}><Trash2 size={17} strokeWidth={2.2} /></PillBtn>
            : <PillBtn onClick={saveAs}>Save</PillBtn>}
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

type Btn = React.ButtonHTMLAttributes<HTMLButtonElement>;
const light = "grid place-items-center bg-[rgba(232,232,237,0.94)] text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:bg-white";

function IconBtn({ className = "", ...props }: Btn) {
  return <motion.button whileTap={{ scale: 0.88 }} transition={spring.press} {...(props as object)} className={`${light} absolute h-[30px] w-[30px] rounded-full ${className}`} />;
}

function PillBtn(props: Btn) {
  return <motion.button whileTap={{ scale: 0.94 }} transition={spring.press} {...(props as object)} className={`${light} h-9 min-w-[84px] rounded-full px-4 text-[15px] font-semibold`} />;
}
