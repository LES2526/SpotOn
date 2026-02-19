function CaixaTextoLogin() {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        id="email"
        name="email"
        placeholder="Introduz aqui o teu email"
        className="px-4 py-2 border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default CaixaTextoLogin;
