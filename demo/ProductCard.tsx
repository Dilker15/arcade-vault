export type ProductCardProps = {
  title?: string;
  genre?: string;
  players?: string;
  price?: number;
  sigil?: string;
};

export const ProductCard = ({
  title = "Neon Drift",
  genre = "Carreras",
  players = "1-2 jugadores",
  price = 24.9,
  sigil = "ND",
}: ProductCardProps) => {
  return (
    <article className="w-72 overflow-hidden border border-[var(--line)] bg-[var(--bg-2)]">
      {/* cartucho */}
      <div className="flex justify-center bg-[var(--bg-3)] px-6 pt-7 pb-5">
        <div className="w-36 rounded-t-md bg-[#1d1d2b] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div
            className="flex h-24 items-center justify-center rounded-sm border border-[var(--line)]"
            style={{
              background:
                "linear-gradient(145deg, rgba(0,245,255,0.16), rgba(255,0,110,0.16))",
            }}
          >
            <span
              className="text-2xl text-[var(--ink)]"
              style={{ fontFamily: "var(--pixel)" }}
            >
              {sigil}
            </span>
          </div>
          {/* peine de contactos */}
          <div
            className="mt-2 h-3"
            style={{
              background:
                "repeating-linear-gradient(90deg, var(--bronze) 0 3px, transparent 3px 6px)",
            }}
          />
        </div>
      </div>

      <div className="border-t border-[var(--line-2)] p-4">
        <h3
          className="text-sm text-[var(--ink)]"
          style={{ fontFamily: "var(--pixel)" }}
        >
          {title}
        </h3>
        <p className="mt-2 text-xs text-[var(--ink-dim)]">
          {genre} · {players}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-base text-[var(--cyan)]">
            {price.toLocaleString("es-ES", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
          <button
            type="button"
            className="border border-[var(--cyan)] px-3 py-1.5 text-xs text-[var(--cyan)] transition-colors hover:bg-[var(--cyan)] hover:text-[var(--bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cyan)]"
          >
            Añadir al carrito
          </button>
        </div>
      </div>
    </article>
  );
};
