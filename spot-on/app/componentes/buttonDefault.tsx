function ButtonDefault(): JSX.Element {
  const tituloButton: string = "Login";

  return (
    <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 hover:scale-105 transition duration-200">
      {tituloButton}
    </button>
  );
}

export default ButtonDefault;
