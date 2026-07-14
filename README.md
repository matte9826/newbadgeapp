# The Secret Garden — App Presenze Cantieri

Web app interna per registrare **entrate e uscite dei dipendenti dai cantieri**
e monitorare le ore lavorate. Due punti d'ingresso distinti:

- **Dipendenti** (ottimizzato per telefono, installabile come app): `/user`
- **Admin / responsabile HR** (ottimizzato per PC): `/admin`

Costruita con Node.js + Express + **Postgres (Supabase)**. L'orario è preso dal
server (fuso Italia con ora legale automatica) e la verifica GPS avviene lato
server. Se `DATABASE_URL` non è impostata, l'app si avvia comunque e mostra le
pagine, ma le azioni sui dati rispondono "database non configurato".

---

## Requisiti

- Node.js 20 o superiore

## Avvio in locale

```bash
npm install
cp .env.example .env    # poi modifica i valori (vedi sotto)
npm start
```

Poi apri:

- Dipendenti: <http://localhost:3000/user>
- Admin: <http://localhost:3000/admin>

Durante lo sviluppo con auto-reload: `npm run dev`.

## Configurazione (`.env`)

Il file `.env` **non** viene versionato (è in `.gitignore`). Contiene:

| Variabile | Descrizione |
|---|---|
| `COMPANY_NAME` | Nome azienda mostrato nell'interfaccia (attuale: *The Secret Garden*). |
| `DATABASE_URL` | Connection string Postgres/Supabase (Connection Pooling, porta 6543). Vuota = app senza database. |
| `DATABASE_SSL` | `disable` solo per un Postgres locale senza TLS. Vuota per Supabase. |
| `ADMIN_USERNAME` | Nome utente dell'unico admin. |
| `ADMIN_PASSWORD` | Password admin. **Mai salvata in chiaro**: all'avvio viene cifrata (bcrypt) e usata per creare/aggiornare l'account admin. |
| `JWT_SECRET` | Chiave per firmare i cookie di sessione. Su Vercel è **obbligatoria**. |
| `PORT` | Porta del server in locale (default 3000). |
| `NODE_ENV` | Imposta `production` in produzione (attiva i cookie `Secure` su HTTPS). |

> Per cambiare la password admin: modifica `ADMIN_PASSWORD` e riavvia (o Redeploy su Vercel).

## Configurare Supabase (database)

1. Crea un account su **supabase.com** → **New project**. Scegli una password
   per il database (annotala) e una region (es. *West EU / Frankfurt*).
2. Quando il progetto è pronto, apri **Connect** (in alto) → sezione
   **Connection string** → scheda **Transaction** (Connection Pooling, porta
   `6543`). Copia la URI: è simile a
   `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-...pooler.supabase.com:6543/postgres`.
   Sostituisci `[YOUR-PASSWORD]` con la password del punto 1.
   ⚠️ Usa la stringa del **pooler** (non la "Direct connection"): su Vercel serve
   quella, perché la connessione diretta è solo IPv6.
3. Le tabelle vengono **create automaticamente** al primo avvio dell'app. In
   alternativa puoi eseguire `schema.sql` dal **SQL Editor** di Supabase.
4. Imposta `DATABASE_URL` con quella stringa (in locale nel `.env`, su Vercel
   nelle Environment Variables) e fai ripartire l'app / **Redeploy**.

## Funzionalità

### Lato dipendente (telefono)
- Registrazione (nome, cognome, password) e login; reset password reinserendo
  nome e cognome. Nessun limite di tentativi.
- Homepage con i soli **cantieri attivi** come schede grandi.
- Profilo cantiere con un unico grande **pulsante di timbratura** che cambia
  stato, con **cronometro dal vivo** quando si è in servizio.
- **Timbra entrata**: verifica GPS lato server (posizione entro il raggio del
  cantiere). Fuori raggio o GPS spento → l'entrata non viene registrata.
- Una sola presenza aperta alla volta.
- Sezione account: nome, **ore del mese corrente** (si azzera la vista a ogni
  mese, lo storico resta), logout.

### Lato admin (PC)
- **Cantieri**: elenco, creazione e modifica. Si inserisce l'**indirizzo** del
  cantiere e viene cercato su mappa (OpenStreetMap/Nominatim) trovando in
  automatico le coordinate GPS — utile per case private di cui non si conoscono
  latitudine/longitudine. Restano disponibili il raggio (default 150 m), lo
  stato attivo/chiuso e, tra le opzioni avanzate, l'inserimento manuale delle
  coordinate e "usa la mia posizione".
- **Vista giornaliera**: chi è entrato, a che ora, in quale cantiere, entrate e
  uscite, ore per turno.
- **Dashboard**: ore totali, turni, ore per giorno / per dipendente / per
  cantiere, con selettore di periodo.
- **Export CSV** compatibile con Google Fogli (UTF-8 con BOM), per la giornata o
  per un intervallo. L'archivio è sempre consultabile ed esportabile, anche per
  i mesi passati.

## Sicurezza

- Password salvate cifrate (bcrypt).
- Controllo del ruolo **lato server** su ogni pagina e azione: i link separati
  `/admin` e `/user` sono solo punti d'ingresso, non una protezione.
- Admin: dopo **3 tentativi falliti**, blocco temporaneo di **15 minuti**.
- In produzione usa sempre **HTTPS** (imposta `NODE_ENV=production`).

## GPS

La verifica della posizione avviene **solo al click su "Timbra entrata"** (non è
un tracciamento continuo). Il telefono invia la posizione, il server calcola la
distanza dal cantiere (haversine) e la confronta con il raggio di tolleranza.

## Data e ora

Ogni timbratura è salvata con timestamp UTC al secondo. Le viste per giorno,
mese e anno si ricavano dai timestamp usando il fuso **Europe/Rome** (ora legale
gestita automaticamente da luxon). Le ore di un turno = uscita − entrata.

## Logo

Il logo attuale è un segnaposto (foglia verde). Per sostituirlo con il logo
aziendale:

- **Icone app (installazione):** sostituisci `public/icons/icon-192.png` e
  `public/icons/icon-512.png`.
- **Logo nell'header:** modifica `logoMark()` in `public/shared/ui.js` (e, se
  vuoi, `public/shared/logo.svg`).

## Struttura del progetto

```
server.js              Server Express + tutte le API (async)
api/index.js           Entry point serverless per Vercel (esporta l'app)
vercel.json            Rewrites (pagine + /api) per Vercel
schema.sql             Schema Postgres (facoltativo: creato in automatico)
src/
  db.js                Client Postgres (pg) + schema + seed admin
  auth.js              Sessioni JWT (cookie httpOnly) + controllo ruoli
  paths.js             Cartella scrivibile (locale ./data, serverless /tmp)
  time.js              Fuso Italia, calcolo ore, confini giorno/mese (luxon)
  geo.js               Distanza GPS (haversine) e verifica raggio
public/
  shared/              Design system (tokens.css), UI helper (ui.js), logo
  user/                App dipendenti (mobile)
  admin/               Console admin (desktop)
  manifest.webmanifest, sw.js   PWA installabile
scripts/gen-icons.js   Genera le icone PWA segnaposto
```

## Deploy su Vercel

L'app è pronta per Vercel: `api/index.js` espone l'app come funzione
serverless e `vercel.json` instrada le richieste. **Devi però impostare le
Environment Variables** nel progetto Vercel (Settings → Environment Variables),
perché il file `.env` non viene caricato su Vercel:

| Variabile | Valore |
|---|---|
| `DATABASE_URL` | connection string Supabase (pooler, porta 6543) — vedi sopra |
| `ADMIN_USERNAME` | il tuo nome utente admin |
| `ADMIN_PASSWORD` | la tua password admin |
| `JWT_SECRET` | una stringa lunga e casuale (obbligatoria su Vercel) |
| `COMPANY_NAME` | `The Secret Garden` |
| `NODE_ENV` | `production` |

Dopo aver salvato le variabili, fai un **Redeploy**.

> ✅ **Persistenza dati.** Con `DATABASE_URL` collegata a Supabase i dati
> (cantieri, registrazioni, timbrature) vengono salvati in modo permanente in
> Postgres — non più su file effimero. Il codice usa `pg` (JavaScript puro),
> quindi non ci sono binari nativi da compilare su Vercel.

## Deploy su un server Node

Su qualsiasi host (Render, Railway, Fly.io, un VPS…): imposta le stesse
variabili d'ambiente (inclusa `DATABASE_URL`), poi `npm install && npm start`,
servendo dietro HTTPS.
