import { createContext, useContext, type ReactNode } from "react";

export const SearchCtx = createContext("");
export const useQuery = () => useContext(SearchCtx);

/** Inset grouped list. Hides itself when search filtered out all its rows. */
export default function Group({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-5 [&:not(:has([data-row]))]:hidden">
      {title && <h2 className="t-section mb-1.5 px-3">{title}</h2>}
      <div
        className="overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-grouped)] shadow-[inset_0_0_0_0.5px_var(--separator)]
          [&>[data-row]+[data-row]]:relative [&>[data-row]+[data-row]]:before:absolute [&>[data-row]+[data-row]]:before:inset-x-3.5 [&>[data-row]+[data-row]]:before:top-0
          [&>[data-row]+[data-row]]:before:h-px [&>[data-row]+[data-row]]:before:bg-[var(--separator)] [&>[data-row]+[data-row]]:before:content-['']"
      >
        {children}
      </div>
      {footer && <p className="t-caption mt-1.5 px-3">{footer}</p>}
    </section>
  );
}
