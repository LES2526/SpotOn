import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
});

/** Sends an email to the session host warning that their presence was questioned. */
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

/** Sends a join request notification email to the session host. */
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

/** Sends an email to a user whose join request was rejected. */
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

/** Sends an email to a user whose join request was approved. */
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

/** Sends an email warning the session host that their session expires in 10 minutes. */
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
