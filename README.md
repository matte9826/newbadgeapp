# The Secret Garden — App Presenze Cantieri

Web app interna per registrare **entrate e uscite dei dipendenti dai cantieri**
e monitorare le ore lavorate. Due punti d'ingresso distinti:

- **Dipendenti** (ottimizzato per telefono, installabile come app): `/user`
- **Admin / responsabile HR** (ottimizzato per PC): `/admin`

Costruita con Node.js + Express + SQLite. Nessun servizio esterno: il database
è un singolo file, l'orario è preso dal server (fuso Italia con ora legale
automatica) e la verifica GPS avviene lato server.

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
| `ADMIN_USERNAME` | Nome utente dell'unico admin. |
| `ADMIN_PASSWORD` | Password admin. **Mai salvata in chiaro**: all'avvio viene cifrata (bcrypt) e usata per creare/aggiornare l'account admin. |
| `JWT_SECRET` | Chiave per firmare i cookie di sessione. Se vuota, ne viene generata e salvata una in `data/.jwt_secret`. |
| `PORT` | Porta del server (default 3000). |
| `NODE_ENV` | Imposta `production` in produzione (attiva i cookie `Secure` su HTTPS). |

> Per cambiare la password admin: modifica `ADMIN_PASSWORD` in `.env` e riavvia.

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
- **Cantieri**: elenco, creazione e modifica (nome, coordinate GPS, raggio,
  stato attivo/chiuso). Pulsante "usa la mia posizione" per compilare le
  coordinate.
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
server.js              Server Express + tutte le API
src/
  db.js                Schema SQLite + seed admin
  auth.js              Sessioni JWT (cookie httpOnly) + controllo ruoli
  time.js              Fuso Italia, calcolo ore, confini giorno/mese (luxon)
  geo.js               Distanza GPS (haversine) e verifica raggio
public/
  shared/              Design system (tokens.css), UI helper (ui.js), logo
  user/                App dipendenti (mobile)
  admin/               Console admin (desktop)
  manifest.webmanifest, sw.js   PWA installabile
scripts/gen-icons.js   Genera le icone PWA segnaposto
data/                  Database SQLite (non versionato)
```

## Deploy su Vercel

L'app è pronta per Vercel: `api/index.js` espone l'app come funzione
serverless e `vercel.json` instrada le richieste. **Devi però impostare le
Environment Variables** nel progetto Vercel (Settings → Environment Variables),
perché il file `.env` non viene caricato su Vercel:

| Variabile | Valore |
|---|---|
| `ADMIN_USERNAME` | il tuo nome utente admin |
| `ADMIN_PASSWORD` | la tua password admin |
| `JWT_SECRET` | una stringa lunga e casuale (obbligatoria su Vercel) |
| `COMPANY_NAME` | `The Secret Garden` |
| `NODE_ENV` | `production` |

Dopo aver salvato le variabili, fai un **Redeploy**.

> ⚠️ **Persistenza dati.** Vercel è serverless: il filesystem è di sola lettura
> tranne `/tmp`, che è temporaneo e non condiviso tra le istanze. Con queste
> correzioni l'app **non va più in crash** e le pagine si aprono, ma su Vercel
> **i dati salvati in SQLite non persistono** in modo affidabile (cantieri,
> registrazioni e timbrature possono azzerarsi). Per un uso reale serve un
> database esterno gestito, es. **Supabase (Postgres)** — è il passo successivo.

## Deploy su un server Node (persistenza reale con SQLite)

In alternativa a Vercel, su qualsiasi host con filesystem persistente
(Render, Railway, Fly.io, un VPS…) SQLite funziona senza modifiche:

1. Imposta le variabili d'ambiente (`ADMIN_USERNAME`, `ADMIN_PASSWORD`,
   `JWT_SECRET`, `NODE_ENV=production`, ecc.).
2. `npm install && npm start`.
3. Servi dietro HTTPS. La cartella `data/` deve essere su storage persistente.
