declare module '*.css';

declare module 'qrcode.react' {
    import type { ComponentType, SVGProps } from 'react';

    export interface QRCodeProps extends SVGProps<SVGSVGElement> {
        value: string;
        size?: number;
        level?: 'L' | 'M' | 'Q' | 'H';
        bgColor?: string;
        fgColor?: string;
        includeMargin?: boolean;
        minVersion?: number;
    }

    export const QRCodeSVG: ComponentType<QRCodeProps>;
}
