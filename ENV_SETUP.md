# .env.local sablon - Supabase konfiguráció

## Hogyan töltsd ki a DATABASE_URL-t?

1. **Menj a Supabase Dashboard-ra**: https://supabase.com/dashboard/project/ndehqxfavtnlilcpojel
2. **Settings → Database** menüpont
3. **Connection string** szakasz
4. Válaszd ki a **"Transaction" módot** (nem a "Session" módot!)
5. Másold ki a connection stringet
6. Illeszd be a `.env.local` fájlba a `DATABASE_URL` értékének

### Példa formátum:
```
DATABASE_URL=postgresql://postgres.ndehqxfavtnlilcpojel:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**FONTOS:** A `[PASSWORD]` helyére írd be az adatbázis jelszavadat!

## Hogyan töltsd ki a Supabase API kulcsokat?

1. **Menj a Supabase Dashboard-ra**: https://supabase.com/dashboard/project/ndehqxfavtnlilcpojel
2. **Settings → API** menüpont
3. **Project API keys** szakasz
4. Másold ki az `anon` `public` kulcsot
5. Illeszd be a `.env.local` fájlba a `NEXT_PUBLIC_SUPABASE_ANON_KEY` értékének

### A URL már ki van töltve:
```
NEXT_PUBLIC_SUPABASE_URL=https://ndehqxfavtnlilcpojel.supabase.co
```

## Ellenőrzés

A megfelelő kitöltés után futtasd:

```bash
npx drizzle-kit push
```

Ha minden rendben van, látni fogod a séma szinkronizálását, és nem lesz connection error.
