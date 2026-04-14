"use client";
import Image from "next/image";
import styles from "./ProfileCard.module.css";
import { ProfileCardProps } from "./type";


export default function ProfileCard({ email, points, image, studentNumber }: Readonly<ProfileCardProps>) {
    const displayName = email.split("@")[0];
    const safePoints = typeof points === "number" && !Number.isNaN(points) ? points : 0;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <span className={styles.brandDot}>●</span>
                <span className={styles.brandName}>SpotOn</span>
            </div>
            <div className={styles.avatarWrapper}>
                {image ? (
                    <Image src={image} alt={displayName} width={90} height={90} className={styles.avatarImg} />
                ) : (
                    <span className={styles.initials}>{getInitials(displayName)}</span>
                )}
            </div>
            <div className={styles.info}>
                <h1 className={styles.name}>{displayName}</h1>
                {studentNumber && (
                    <p className={styles.studentNumber}>Nº {studentNumber}</p>
                )}
                <p className={styles.email}>{email}</p>
            </div>
            <div className={styles.pointsBlock}>
                <span className={styles.pointsNumber}>{safePoints}</span>
                <span className={styles.pointsLabel}>{safePoints === 1 ? "ponto" : "pontos"}</span>
            </div>
        </div>
    );
}

function getInitials(name: string): string {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts.at(-1)?.[0]).toUpperCase();
}
