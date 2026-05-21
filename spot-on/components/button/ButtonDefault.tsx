import Link from "next/link";
import { ButtonDefaultProps } from "./type";


function ButtonDefault({ href, children }: Readonly<ButtonDefaultProps>) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 md:py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 min-h-[44px]"
        >
            {children}
        </Link>
    );
}

export default ButtonDefault;
