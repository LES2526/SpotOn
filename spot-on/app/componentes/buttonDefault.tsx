import Link from "next/link";

type ButtonDefaultProps = {
  href: string;
  children: React.ReactNode; //quase dizer que pode assumir qlqr tipo/renderizar qlqr coisa
};

function ButtonDefault({ href, children }: ButtonDefaultProps) {
  return (
    <Link
      href={href}
      className="px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 hover:scale-105 transition duration-200"
    >
      {children}
    </Link>
  );
}

export default ButtonDefault;
