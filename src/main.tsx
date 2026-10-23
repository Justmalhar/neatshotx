import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const routes: Record<string, React.LazyExoticComponent<() => React.JSX.Element | null>> = {
  selector: lazy(() => import("./views/Selector")),
  "quick-access": lazy(() => import("./views/QuickAccess")),
  editor: lazy(() => import("./views/Editor")),
  pin: lazy(() => import("./views/Pin")),
  ocr: lazy(() => import("./views/Ocr")),
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <View />
    </Suspense>
  </StrictMode>,
);
