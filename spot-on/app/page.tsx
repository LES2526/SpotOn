import ButtonDefault from "../components/button/ButtonDefault";

export default function Home() {
    return (
        <main className="relative min-h-screen">
            <div
                className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage:
                        "url('/background_home.png')",
                }}
            >
                <div className="absolute inset-0 bg-black/40" />

                <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-lg backdrop-blur mx-4">
                    <div className="flex flex-col items-center gap-6">
                        <h1 className="text-3xl font-bold text-center">Bem-vindo ao SpotON!</h1>
                        <ButtonDefault href="/dashboard">ENTRAR</ButtonDefault>
                    </div>
                </div>
            </div>

            <p className="absolute bottom-4 right-4 text-xs text-white/70 z-10">
                Projeto Académico · LES 25/26
            </p>
        </main>
    );
}
