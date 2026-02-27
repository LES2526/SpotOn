![](https://cdn.discordapp.com/attachments/1150911489104936991/1476621144613191710/Spot_On1.png?ex=69a1ca1b&is=69a0789b&hm=751c235d32fda0dc3b1103660c3c29bc6697d18abbf9fb50958aa38ddf0d3b7c&)

A real-time campus library study space management system that helps students find and reserve available study spaces with seamless QR code check-in functionality.

## 🎯 Overview

Spot On! is a modern web application designed to solve the common problem of finding available study spaces in busy campus libraries. Students can view real-time availability, and check in using QR codes, while library staff can efficiently manage space utilization.

## ✨ Features

- **Real-time Availability Tracking** - View current occupancy status of all study spaces
- **QR Code Check-in** - Quick and contactless check-in process
- **Interactive Study Desk View** - Visual representation of library layout and availability
- **User Authentication** - Secure login system for students and staff

## 🛠️ Tech Stack

- **Frontend**: Next.js (React Framework)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Containerization**: Docker
- **Styling**: CSS (globals.css, layout.tsx)
- **Testing**: Jest

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Docker](https://www.docker.com/) and Docker Compose
- [Git](https://git-scm.com/)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/LES2526/SpotOn
cd spot-on
```

### 2. Start the project

```bash
docker compose up
```

### 3. Run Database Migrations

```bash
npx prisma migrate dev
npx prisma generate
```

Visit [http://localhost:3000](http://localhost:3000) to see the application running.

## 📁 Project Structure

```
spot-on/
├── .github/              # GitHub configuration
├── __tests__/            # Test files
├── .next/                # Next.js build output
├── .swc/                 # SWC compiler cache
├── app/                  # Next.js app directory
│   ├── api/              # API routes
│   ├── components/       # React components
│   │   ├── login/        # Login components
│   │   └── study-desk/   # Study desk components
│   ├── generated/        # Generated files
│   ├── favicon.ico       # Site favicon
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── lib/                  # Utility libraries
├── node_modules/         # Dependencies
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets
├── .dockerignore         # Docker ignore rules
├── .env                  # Environment variables
├── .gitignore            # Git ignore rules
├── compose.yaml          # Docker Compose configuration
├── Dockerfile            # Docker configuration
├── eslint.config.mjs     # ESLint configuration
├── jest.config.ts        # Jest configuration
├── jest.setup.ts         # Jest setup
├── next-env.d.ts         # Next.js TypeScript declarations
├── next.config.ts        # Next.js configuration
├── package-lock.json     # Lock file
├── package.json          # Project dependencies
├── postcss.config.mjs    # PostCSS configuration
├── prisma.config.ts      # Prisma configuration
└── tsconfig.json         # TypeScript configuration
```

# Spot On! Database Schema

## Overview

The database is divided into two main sections:
1. **NextAuth.js Models** - Handle authentication and user sessions
2. **Spot-On Domain Models** - Core business logic for study space management

---

## NextAuth.js Models

### User

The central user model representing students and staff in the Spot On system.

**Key Fields:**
- `id` - Unique identifier (CUID, max 30 chars)
- `studentId` - Student number (unique, optional for staff)
- `department` - Academic department
- `name` - Full name
- `email` - University email (must be @ualg.pt, unique)
- `emailVerified` - Timestamp of email verification
- `image` - Profile picture URL

**Relationships:**
- Can have multiple authentication accounts (Google, email, etc.)
- Can have multiple active sessions
- Can host study sessions
- Can participate in study sessions

**Business Rules:**
- Only @ualg.pt emails are accepted (validated in backend)
- Tracks creation and update timestamps

---

### Account

Stores authentication provider information for users. Supports multiple login methods per user.

**Key Fields:**
- `userId` - Reference to User
- `type` - Account type (oauth, email, etc.)
- `provider` - Provider name (google, credentials, etc.)
- `providerAccountId` - User's ID with the provider
- `refresh_token` - OAuth refresh token
- `access_token` - OAuth access token
- `expires_at` - Token expiration timestamp
- `scope` - Space-separated OAuth permissions

**Relationships:**
- Belongs to one User
- Cascade deletes when user is deleted

**Composite Key:**
- `[provider, providerAccountId]` - Ensures unique provider accounts

---

### Session

Represents active login sessions for authenticated users.

**Key Fields:**
- `sessionToken` - Unique session identifier
- `userId` - Reference to User
- `expires` - Session expiration timestamp

**Relationships:**
- Belongs to one User
- Cascade deletes when user is deleted

**Purpose:**
- Tracks active user sessions
- Enables session-based authentication
- Automatic cleanup when user is deleted

---

### VerificationToken

Stores magic link tokens for passwordless email authentication.

**Key Fields:**
- `identifier` - Usually the user's email
- `token` - Unique verification token
- `expires` - Token expiration (typically 5 minutes)

**Composite Key:**
- `[identifier, token]` - Ensures unique tokens per identifier

**Purpose:**
- Enables passwordless login via email links
- Short-lived tokens for security
- Automatically expire after 5 minutes

---

## Spot-On Domain Models

### Enums

#### SessionStatus
- `ACTIVE` - Session is currently ongoing
- `COMPLETED` - Session ended normally
- `OVERDUE` - Session exceeded expected end time

#### InvitationStatus
- `PENDING` - Invitation sent, awaiting response
- `ACCEPTED` - User accepted and joined session
- `REJECTED` - User declined invitation

---

### Space

Represents a physical study space in the campus library.

**Key Fields:**
- `id` - Unique identifier (CUID)
- `name` - Space name/number
- `location` - Physical location in library
- `capacity` - Maximum number of students
- `currentQrToken` - Active QR code token for check-in (unique)
- `description` - Optional space details
- `hasPowerOutlet` - Indicates if power outlets are available

**Relationships:**
- Can host multiple study sessions (historical and current)

**Features:**
- QR code token for contactless check-in
- Tracks amenities (power outlets)
- Maintains historical session data

---

### StudySession

Represents an active or completed study session in a space.

**Key Fields:**
- `id` - Unique identifier (CUID)
- `spaceId` - Reference to Space
- `hostId` - Reference to User who created the session
- `startTime` - When the session started (defaults to now)
- `expectedEndTime` - When the session is planned to end
- `actualEndTime` - When the session actually ended (null if active)
- `status` - Current status (ACTIVE/COMPLETED/OVERDUE)

**Relationships:**
- Belongs to one Space
- Belongs to one User (host)
- Has multiple participants through UserOnStudySession

**Business Logic:**
- Tracks expected vs actual end times
- Host is automatically tracked
- Status helps identify overdue sessions

---

### UserOnStudySession

Junction/pivot table managing many-to-many relationship between Users and StudySessions.

**Key Fields:**
- `userId` - Reference to User
- `sessionId` - Reference to StudySession
- `isHost` - Indicates if this user is the session host
- `status` - Invitation status (PENDING/ACCEPTED/REJECTED)
- `joinedAt` - Timestamp when user joined

**Composite Key:**
- `[userId, sessionId]` - Ensures a user can only join a session once

**Purpose:**
- Tracks session participation
- Manages invitations and acceptances
- Distinguishes between host and regular participants
- Records join timestamps for analytics

---

## Key Relationships Summary

```
User (1) ──── (M) Account
User (1) ──── (M) Session
User (1) ──── (M) StudySession [as host]
User (M) ──── (M) StudySession [as participant, through UserOnStudySession]

Space (1) ──── (M) StudySession

StudySession (M) ──── (M) User [through UserOnStudySession]
```

---

## Database Features

- **Cascading Deletes**: Account and Session automatically delete when User is removed
- **Unique Constraints**: Emails, student IDs, QR tokens, and session tokens are unique
- **Timestamps**: Most models track creation and update times
- **Soft State**: Sessions track status (active, completed, overdue) rather than hard deletes
- **Audit Trail**: Join timestamps and status changes provide activity history


To view the full schema:

```bash
npx prisma studio
```

## 🧪 Testing

Run the test suite:

```bash
npm run test
```

## 📱 Key Features Explained

### QR Code Check-in

Each study space has a unique QR code that students can scan to check in. The system validates the reservation and marks the space as occupied.

### Study Desk Component

The interactive study desk view provides a visual representation of the library layout, showing:
- Available spaces (green)
- Occupied spaces (red)
- Reserved spaces (yellow)
- Your current reservation (blue)

### Login System

Secure authentication system allowing:
- Student login for space booking
- Staff login for management
- Session management

## 🔧 Configuration

### Next.js Configuration

Customize `next.config.ts` for:
- Environment variables
- Image optimization
- API routes
- Build settings

### Prisma Configuration

Edit `prisma/schema.prisma` to:
- Modify database models
- Add new fields
- Configure relationships

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **André Martins**  [GitHub](https://github.com/V1zinho)
- **António Matoso**  [GitHub](https://github.com/Matoso-dev)
- **Tomás Machado**  [GitHub](https://github.com/Machado65)
- **Vasco Hilário**  [GitHub](https://github.com/PartyOnTheBeat)

## 🙏 Acknowledgments

- Thanks to the campus library staff for their input
- Built with [Next.js](https://nextjs.org/)
- Database powered by [PostgreSQL](https://www.postgresql.org/)
- ORM by [Prisma](https://www.prisma.io/)
