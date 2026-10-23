import { Component, StrictMode, lazy, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const routes: Record<string, React.LazyExoticComponent<() => React.JSX.Element | null>> = {
  selector: lazy(() => import("./views/Selector")),
  "quick-access": lazy(() => import("./views/QuickAccess")),
  editor: lazy(() => import("./views/Editor")),
  pin: lazy(() => import("./views/Pin")),
  countdown: lazy(() => import("./views/Countdown")),
  "record-bar": lazy(() => import("./views/RecordBar")),
  "scroll-bar": lazy(() => import("./views/ScrollBar")),
  webcam: lazy(() => import("./views/Webcam")),
  "input-overlay": lazy(() => import("./views/InputOverlay")),
  home: lazy(() => import("./views/Home")),
};
const opaque = new Set(["editor", "home", "pin"]);

const name = location.hash.replace(/^#\/?/, "").split("?")[0] || "home";
if (!opaque.has(name)) document.body.classList.add("transparent");
const View = routes[name] ?? routes.home;

/** A crashed view shows its error instead of a blank window. */
class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const e = this.state.error;
    if (!e) return this.props.children;
    return (
      <div className="mat-regular m-4 rounded-[var(--r-lg)] p-4 text-xs select-text">
        <div className="t-headline mb-1">Something went wrong</div>
        <pre className="whitespace-pre-wrap font-mono opacity-80">{e.message}{"\n"}{e.stack}</pre>
      </div>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Boundary>
      <Suspense fallback={null}>
        <View />
      </Suspense>
    </Boundary>
  </StrictMode>,
);
