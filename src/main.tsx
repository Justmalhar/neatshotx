import { Component, StrictMode, lazy, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { installDesktopBehavior } from "./ui/desktop";

const routes: Record<string, React.LazyExoticComponent<() => React.JSX.Element | null>> = {
  selector: lazy(() => import("./views/Selector")),
  "quick-access": lazy(() => import("./views/QuickAccess")),
  editor: lazy(() => import("./views/Editor")),
  pin: lazy(() => import("./views/Pin")),
  countdown: lazy(() => import("./views/Countdown")),
  "scroll-bar": lazy(() => import("./views/ScrollBar")),
  home: lazy(() => import("./views/Home")),
  welcome: lazy(() => import("./views/Welcome")),
};
const opaque = new Set(["editor", "home", "pin", "welcome"]);

const name = location.hash.replace(/^#\/?/, "").split("?")[0] || "home";
if (!opaque.has(name)) document.body.classList.add("transparent");
installDesktopBehavior(name, {
  vibrancy: ["scroll-bar", "countdown"].includes(name),
  closable: ["editor", "home", "pin", "welcome"].includes(name),
});
const View = routes[name] ?? routes.home;

/** A crashed view shows its error instead of a blank window. */
class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const e = this.state.error;
    if (!e) return this.props.children;
    return (
      <div className="ns-group t-callout m-4 p-4 select-text">
        <div className="mb-1 flex items-center justify-between">
          <span className="t-headline">Something went wrong</span>
          <button className="ns-btn" onClick={() => location.reload()}>Reload</button>
        </div>
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
