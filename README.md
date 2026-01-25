# Accept Timesheet Processing - Next.js

Ez az **Accept Timesheet Processing** alkalmazás Next.js-re történő migrációja a Vite + React + Express architektúráról.

## 🚀 Miért Next.js?

- **Modern architektúra**: App Router React Server Components támogatással
- **Optimalizált teljesítmény**: Automatic code splitting és optimalizálás
- **Egyszerűbb deploy**: Egyetlen alkalmazás frontend és backend API-val
- **TypeScript first**: Kiváló fejlesztői élmény
- **Production-ready**: Beépített optimalizálások és best practices

## ✨ Jelenlegi státusz

### ✅ Kész funkciók

- **Projekt setup**: Next.js 14+ TypeScript-tel és App Router-rel
- **Adatbázis**: Drizzle ORM Neon PostgreSQL-lel
- **Autentikáció**: NextAuth.js szerepkör-alapú hozzáféréssel
- **UI komponensek**: 25+ shadcn/ui komponens telepítve
- **Stílusok**: Tailwind CSS v4 teljes témával
- **Navigáció**: Szerepkör-alapú menürendszer
- **Dashboard**: Alapvető dashboard kezdőlappal
- **Build**: Sikeres production build

### 📋 Következő lépések

1. **Környezeti változók beállítása** (.env.local):
   - Adatbázis kapcsolat
   - NextAuth secret
   - Google Cloud Storage
   - Resend (email)
   - Twilio (SMS)

2. **API route-ok migrálása**:
   - Timesheets CRUD
   - Client management
   - User management
   - Approval batches
   - Payroll
   - És további...

3. **Oldalak migrálása**:
   - Timesheets oldal
   - Client Approvals
   - User Management
   - Payroll
   - És további admin/management oldalak

## 🛠️ Technológiai stack

- **Framework**: Next.js 14+
- **Nyelv**: TypeScript
- **Adatbázis**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Auth**: NextAuth.js v5
- **UI**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS v4
- **State**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form + Zod
- **Külső szolgáltatások**:
  - Google Cloud Storage (fájl feltöltés)
  - Resend (email)
  - Twilio (SMS)

## 📦 Telepítés és futtatás

### Előfeltételek

- Node.js 18+ telepítve
- npm vagy pnpm package manager

### Lépések

1. **Függőségek telepítése**:
```bash
cd acceptrec-nextjs-new
npm install
```

2. **Környezeti változók beállítása**:

Másold át a `.env.local` fájlt és töltsd ki a saját értékeiddel:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-generate-with-openssl-rand-base64-32

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=./path-to-credentials.json

# Email - Resend
RESEND_API_KEY=re_your_api_key

# SMS - Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

3. **Adatbázis séma szinkronizálása**:
```bash
npx drizzle-kit push
```

4. **Fejlesztői szerver indítása**:
```bash
npm run dev
```

Az alkalmazás elérhető lesz a `http://localhost:3000` címen.

5. **Production build**:
```bash
npm run build
npm start
```

## 📁 Projekt struktúra

```
acceptrec-nextjs-new/
├── app/
│   ├── (auth)/              # Auth route csoport
│   │   └── login/           # Login oldal
│   ├── (protected)/         # Védett route csoport
│   │   └── dashboard/       # Dashboard és egyéb védett oldalak
│   ├── api/
│   │   └── auth/           # NextAuth API
│   ├── globals.css         # Globális stílusok
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Root page (redirect)
├── components/
│   ├── ui/                  # shadcn/ui komponensek
│   ├── navigation.tsx       # Fő navigáció
│   └── providers.tsx        # Client-side providerek
├── lib/
│   ├── auth.ts             # NextAuth konfiguráció
│   ├── db.ts               # Drizzle adatbázis kliens
│   └── utils.ts            # Utility függvények
├── shared/
│   └── schema.ts           # Drizzle adatbázis séma
├── public/                  # Statikus fájlok
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript típusdefiníciók
└── drizzle.config.ts       # Drizzle konfiguráció
```

## 🔐 Autentikáció és szerepkörök

Az alkalmazás 4 szerepkört támogat:

- **Driver**: Sofőrök - időnyilvántartás kitöltése
- **Client**: Kliensek - időnyilvántartás jóváhagyása
- **Admin**: Admin - teljes hozzáférés kivéve törölt elemek
- **Super Admin**: Super admin - teljes hozzáférés minden funkcióhoz

### Demo bejelentkezés

Jelenleg a bejelentkezés demo módban működik - bármely email címmel be lehet jelentkezni, és a rendszer automatikusan létrehoz egy felhasználót "driver" szerepkörrel. Éles használatra implementálni kell a valódi autentikációt (pl. jelszó hash, email verifikáció, stb.).

## 🔧 Fejlesztés

### Hasznos parancsok

```bash
# Fejlesztői szerver
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Lint
npm run lint

# Adatbázis migrációk
npx drizzle-kit generate  # Migrációs fájlok generálása
npx drizzle-kit push      # Séma push adatbázisba
npx drizzle-kit studio    # Drizzle Studio (adatbázis UI)
```

### Új oldal hozzáadása

1. Hozz létre egy új mappát `app/(protected)/` alatt
2. Add hozzá a `page.tsx` fájlt
3. A navigációs menübe add hozzá a linket a `components/navigation.tsx`-ben

### Új API endpoint hozzáadása

1. Hozz létre egy új mappát `app/api/` alatt
2. Add hozzá a `route.ts` fájlt `GET`, `POST`, `PATCH`, `DELETE` exportokkal
3. Használd a `requireAuth()` vagy `requireRole()` helpereket autorizációhoz

## 🚨 Fontos megjegyzések

- Az eredeti alkalmazás Replit Auth-ot használt, ez egyszerűsített demo autentikációra lett migrálva
- A környezeti változókat ki kell tölteni a működéshez
- Az API route-ok nagy része még migrálásra vár
- A fájl feltöltés és külső szolgáltatás integrációk készen állnak, de még nincsenek bekötve

## 📞 Támogatás

Ha kérdésed van a migrációval vagy a kóddal kapcsolatban, nézd meg:
1. `implementation_plan.md` - Részletes migráció terv
2. `task.md` - Feladat lista és státusz
3. `design_guidelines.md` - Design irányelvek

## 📜 License

MIT
