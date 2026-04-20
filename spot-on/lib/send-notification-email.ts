import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
});

export async function sendProofOfPresenceEmail(to: string) {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'A tua presença foi questionada!',
        html: `
            <p>
            A tua presença no espaço foi questionada.
            </p>
            <p>
            <strong>Tens 10 minutos para fazeres scan do QR code ou perdes a reserva.
            </strong></p>
        `,
    });
}

export async function sendJoinRequestEmail(to: string,
    requesterEmail: string) {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'Alguém quer juntar-se à tua sessão!',
        html: `
            <p>
            <strong>${requesterEmail}</strong> quer juntar-se à tua sessão.
            </p>
        `,
    });
}

export async function sendNotAcceptedJoinRequestEmail(to: string) {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'Pedido para juntar-se à sessão rejeitado',
        html: `
            <p>
            O teu pedido para juntar-se à sessão foi rejeitado.
            </p>
        `,
    });
}

export async function sendApprovedJoinRequestEmail(to: string) {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'Pedido para juntar-se à sessão aprovado',
        html: `
            <p>
            O teu pedido para juntar-se à sessão foi aprovado! Vemo-nos lá.
            </p>
        `,
    });
}

export async function sendSessionExpiringSoonEmail(to: string) {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'O teu tempo está quase a acabar!',
        html: `
            <p>
            A tua sessão termina em <strong>10 minutos</strong>.
            </p>
        `,
    });
}
