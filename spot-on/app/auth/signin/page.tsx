import SignInForm from "@/components/auth/SignInForm";

export default function SignInPage() {
    return <SignInForm allowedDomain={process.env.ALLOWED_EMAIL_DOMAIN!} />;
}
