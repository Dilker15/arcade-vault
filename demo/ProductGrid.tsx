import { ProductCard, type ProductCardProps } from "./ProductCard";

type Product = ProductCardProps & { id: string };

const CATALOGO: Product[] = [
  {
    id: "neon-drift",
    title: "Neon Drift",
    genre: "Carreras",
    players: "1-2 jugadores",
    price: 24.9,
    sigil: "ND",
  },
  {
    id: "void-breaker",
    title: "Void Breaker",
    genre: "Arcade",
    players: "1 jugador",
    price: 18.5,
    sigil: "VB",
  },
  {
    id: "pixel-siege",
    title: "Pixel Siege",
    genre: "Estrategia",
    players: "1-4 jugadores",
    price: 32,
    sigil: "PS",
  },
  {
    id: "chrome-alley",
    title: "Chrome Alley",
    genre: "Lucha",
    players: "2 jugadores",
    price: 27.9,
    sigil: "CA",
  },
  {
    id: "starfall-99",
    title: "Starfall 99",
    genre: "Naves",
    players: "1-2 jugadores",
    price: 21,
    sigil: "S9",
  },
  {
    id: "block-rush",
    title: "Block Rush",
    genre: "Puzzle",
    players: "1 jugador",
    price: 14.9,
    sigil: "BR",
  },
];

export const ProductGrid = ({
  products = CATALOGO,
}: {
  products?: Product[];
}) => {
  if (products.length === 0) {
    return (
      <p className="p-8 text-center text-xs text-[var(--ink-dim)]">
        Todavía no hay cartuchos en el catálogo.
      </p>
    );
  }

  return (
    <ul className="grid list-none justify-center gap-5 p-0 [grid-template-columns:repeat(auto-fill,18rem)]">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard {...product} />
        </li>
      ))}
    </ul>
  );
};
