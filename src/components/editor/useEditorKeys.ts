import { useEffect, useRef } from "react";
import { TOOLS } from "./tools";
import type { Tool } from "./types";

export type KeyHandlers = {
  editing: boolean;
  hasCrop: boolean;
  hasSelection: boolean;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  save: () => void;
  saveAs: () => void;
  saveProject: () => void;
  done: () => void;
  remove: () => void;
  duplicate: () => void;
  nudge: (dx: number, dy: number) => void;
  applyCrop: () => void;
  escape: () => void;
  setTool: (t: Tool) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  zoomActual: () => void;
};

/** One window keydown listener that always sees the latest handlers. */
export function useEditorKeys(h: KeyHandlers) {
  const ref = useRef(h);
  ref.current = h;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = ref.current;
      const tag = (e.target as HTMLElement).tagName;
      if (k.editing || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const eat = (f: () => void) => { e.preventDefault(); f(); };
      if (mod) {
        if (e.altKey && e.code === "KeyS") return eat(k.saveProject);
        if (e.key === "Enter") return eat(k.done);
        if (key === "z") return eat(e.shiftKey ? k.redo : k.undo);
        if (key === "c") return eat(k.copy);
        if (key === "s") return eat(e.shiftKey ? k.saveAs : k.save);
        if (key === "d") return eat(k.duplicate);
        if (key === "=" || key === "+") return eat(k.zoomIn);
        if (key === "-") return eat(k.zoomOut);
        if (key === "0") return eat(k.zoomFit);
        if (key === "1") return eat(k.zoomActual);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && k.hasSelection) return eat(k.remove);
      if (e.key === "Enter" && k.hasCrop) return eat(k.applyCrop);
      if (e.key === "Escape") return k.escape();
      if (k.hasSelection && e.key.startsWith("Arrow")) {
        const d = e.shiftKey ? 10 : 1;
        return eat(() => k.nudge(e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0, e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0));
      }
      const t = TOOLS.find((t) => t.key === key);
      if (t && !e.altKey) k.setTool(t.id);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
}
