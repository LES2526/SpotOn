import ButtonDefault from "../components/login/ButtonDefault";

export default function Home() {
    return (
        <main className="min-h-screen">
            <div
                className="min-h-screen flex items-center justify-center bg-cover bg-center"
                style={{
                    backgroundImage:
                        "url('https://www.taglivros.com/blog/wp-content/uploads/2020/09/Post-Instagram-1000x1000.png')",
                }}
            >
                <div className="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-lg backdrop-blur">
                    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
                        <h1 className="text-3xl font-bold">Bem-vindo ao SpotON!</h1>
                        <ButtonDefault href="/api/auth/signin?callbackUrl=%2Fdashboard">ENTRAR</ButtonDefault>                    </div>
                </div>
            </div>
        </main>
    );
}
