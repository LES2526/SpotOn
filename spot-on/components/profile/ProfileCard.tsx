"use client";

import Image from "next/image";
import styles from "./ProfileCard.module.css";

interface ProfileCardProps {
  name: string;
  email: string;
  points: number;
  image?: string;
  studentNumber?: string;
}

export default function ProfileCard({ name, email, points, image, studentNumber }: ProfileCardProps) {
  const safePoints = typeof points === "number" && !isNaN(points) ? points : 0;

  return (
    <div className={styles.card}>
      {/* SpotOn header */}
      <div className={styles.header}>
        <span className={styles.brandDot}>●</span>
        <span className={styles.brandName}>SpotOn</span>
      </div>

      {/* Avatar */}
      <div className={styles.avatarWrapper}>
        {image ? (
          <Image src={image} alt={name} width={90} height={90} className={styles.avatarImg} />
        ) : (
          <span className={styles.initials}>{getInitials(name)}</span>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <h1 className={styles.name}>{name}</h1>
        {studentNumber && (
          <p className={styles.studentNumber}>Nº {studentNumber}</p>
        )}
        <p className={styles.email}>{email}</p>
      </div>

      {/* Points */}
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
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
