import { Resend } from 'resend';

const FROM = process.env.EMAIL_FROM ?? 'Spot-On UAlg <onboarding@resend.dev>';

function getResend() {
    return new Resend(process.env.RESEND_API_KEY);
}

/** Sends an email to the session host warning that their presence was questioned. */
export async function sendProofOfPresenceEmail(to: string) {
    await getResend().emails.send({
        from: FROM,
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
export async function sendJoinRequestEmail(to: string, requesterEmail: string) {
    await getResend().emails.send({
        from: FROM,
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
    await getResend().emails.send({
        from: FROM,
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
    await getResend().emails.send({
        from: FROM,
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
    await getResend().emails.send({
        from: FROM,
        to,
        subject: 'O teu tempo está quase a acabar!',
        html: `
            <p>
            A tua sessão termina em <strong>10 minutos</strong>.
            </p>
        `,
    });
}

/** Sends the magic-link verification email for sign-in. */
export async function sendVerificationEmail(to: string, url: string) {
    await getResend().emails.send({
        from: FROM,
        to,
        subject: 'Entrar no Spot-On',
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#111;color:#e5e7eb;border-radius:12px">
                <h2 style="margin:0 0 8px;font-size:22px;color:#fff">Entrar no Spot-On</h2>
                <p style="margin:0 0 24px;color:#9ca3af">Clica no botão abaixo para aceder à tua conta. O link expira em <strong style="color:#e5e7eb">5 minutos</strong>.</p>
                <a href="${url}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Entrar na conta</a>
                <p style="margin:24px 0 0;font-size:12px;color:#6b7280">Se não pediste este email, podes ignorá-lo com segurança.</p>
            </div>
        `,
    });
}
