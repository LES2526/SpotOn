import { Suspense } from "react";
import QRCodeContent from "./QRCodeContent";
import LoadingStatus from "@/components/qrcode/Loading";

export default function OccupySpacePage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <LoadingStatus />
                <LoadingStatus />
            </div>
        }>
            <QRCodeContent />
        </Suspense>
    );
}