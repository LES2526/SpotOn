import Link from "next/link";
import ButtonDefault from "./componentes/buttonDefault";

export default function Home() {
  return (
    <main>
      <h1>Bem-vindo ao SpotON!</h1>
      <Link href="/login">
        <ButtonDefault />
      </Link>
    </main>
  );
}
