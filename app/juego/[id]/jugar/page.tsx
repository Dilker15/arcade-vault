import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { GamePlayer } from "@/components/game-player";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default function GamePlayerPage({ params }: PageProps<"/juego/[id]/jugar">) {
  return (
    <Suspense fallback={null}>
      <GamePlayerContent params={params} />
    </Suspense>
  );
}

async function GamePlayerContent({
  params,
}: {
  params: PageProps<"/juego/[id]/jugar">["params"];
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
