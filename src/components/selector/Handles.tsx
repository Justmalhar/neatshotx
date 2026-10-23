import { HANDLES, HANDLE_CURSOR, type Handle } from "./geometry";

const pos = (h: Handle): React.CSSProperties => ({
  left: h.includes("w") ? 0 : h.includes("e") ? "100%" : "50%",
  top: h.includes("n") ? 0 : h.includes("s") ? "100%" : "50%",
  cursor: HANDLE_CURSOR[h],
});

/** 8 resize handles: 20px hit target, 9px white dot. Pointer handling lives on the root via data-handle. */
export default function Handles() {
  return (
    <>
      {HANDLES.map((h) => (
        <div key={h} data-handle={h} className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center" style={pos(h)}>
          <div className="pointer-events-none h-[9px] w-[9px] rounded-full bg-white" style={{ boxShadow: "0 0 0 0.5px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.4)" }} />
        </div>
      ))}
    </>
  );
}
