# ListaDellaSpesa 🍊

Una web application per la lista della spesa condivisa, progettata specificamente per essere semplice, leggera e resiliente alle interruzioni di connettività (**offline-first**). Ottimizzata per 2 o 3 utenti e pronta per essere esposta su internet in tutta sicurezza.

Pesantemente ispirata da SpecificallyClementines [https://github.com/davideshay/groceries], ho optato per un approccio più leggero, eliminando il database "da produzione" in favore di uno più leggero, preservando comunque quanto scritto sopra.
Inoltre, l'ho personalizzato di più sul mio caso d'uso.

## 🔄 Il Flusso di Lavoro (Workflow)

L'applicazione è strutturata in due schede principali pensate per le diverse fasi della spesa:

1. **📋 Catalogo Articoli (Fase di Compilazione)**:
   - Contiene il database storico di tutti i tuoi articoli abituali (es. Latte, Pane, Clementine).
   - Quando prepari la lista da casa, ti basta scorrere il catalogo e **selezionare (togliere la spunta spenta per farla diventare arancione)** gli articoli che ti servono. 
   - Gli articoli selezionati (`needed = 1`) compariranno automaticamente nella scheda della spesa.

2. **🛒 Da Comprare (Fase di Spesa al Supermercato)**:
   - Mostra solo gli articoli selezionati per l'acquisto corrente, ordinati e raggruppati per corsia/categoria (es. Ortofrutta, Latticini) nell'ordine esatto che hai configurato per il supermercato attivo.
   - Quando sei nel negozio e metti un articolo nel carrello fisicamente, ti basta **deselezionarlo (tapparci sopra)**. L'articolo sfumerà e scivolerà fuori dalla lista attiva, tornando nel catalogo come non selezionato (`needed = 0`) per la prossima volta. Non serve cancellare e riscrivere i prodotti ogni settimana!

---

## 🌟 Caratteristiche Principali

- **Offline-First & Auto-Sync (Articoli + Impostazioni)**: Puoi compilare la lista o deselezionare elementi anche nei supermercati senza segnale internet. L'app salva tutto localmente tramite `localStorage` e risincronizza le modifiche in background non appena la connettività si ripristina. 
- **Sicurezza Avanzata (Login & HTTPS)**: Per ridurre la superficie d'attacco in caso di esposizione su internet, l'applicazione è protetta da un **middleware di autenticazione globale** con sessioni basate su cookie `HttpOnly` e `SameSite` sicuri.
- **Mappa Interattiva del Supermercato e Ottimizzazione del Percorso (TSP)**:
  - Consente di disegnare graficamente una mappa o un grafo per ciascun supermercato (con supporto **multi-piano**, nodi `Ingresso`, `Casse`, categorie e `Corridoio/Passaggio` neutrali).
  - Se un supermercato ha una mappa configurata, la lista "Da Comprare" si ordinerà **automaticamente** calcolando il percorso più breve (algoritmo basato su Floyd-Warshall e TSP Nearest Neighbor) per raccogliere gli articoli necessari, riducendo al minimo anche i cambi di piano.
- **Inserimento Rapido Unificato (Implicit Quick-Add)**:
  - Una barra unica **"Cerca o aggiungi articolo..."** fonde la ricerca e l'aggiunta.
  - Se l'articolo cercato esiste, premendo Invio (o cliccando `+`) viene aggiunto subito alla lista. Se non esiste, viene creato implicitamente all'istante con auto-categorizzazione intelligente tramite Smartwords, senza fastidiosi popup di conferma.
- **Stato Sync Cliccabile**: Il badge di stato "Sincronizzato" mostra da quanti secondi/minuti è avvenuto l'ultimo allineamento (es. `Sincronizzato (10s fa)`) e può essere cliccato per forzare manualmente una sincronizzazione immediata.
- **Categorie e Smartwords Personalizzabili**: Ciascuna categoria supporta un elenco di "Smartwords" (parole chiave) personalizzabili: digitando un nuovo prodotto, l'app lo assegnerà in automatico alla categoria corretta.
- **Risoluzione dei Conflitti Semplice**: Utilizza un meccanismo di sincronizzazione basato su timestamps con logica *Last-Write-Wins* (L'ultima scrittura vince).

---

## 🛠️ Stack Tecnologico

- **Backend**: Python 3 con **FastAPI** (middleware di sicurezza, cookie parser) e **SQLite**.
- **Frontend**: Single Page Application (SPA) in HTML5, JavaScript (ES6, canvas 2D per il disegno mappe) e Vanilla CSS3 con Google Fonts e FontAwesome.
- **Gestore Dipendenze**: `uv` per un'esecuzione rapida e senza configurazioni complesse.

---

## 🚀 Come Eseguire l'Applicazione

### Esecuzione locale con `uv`

Visto l'utilizzo di `uv` e dei metadati in linea dello script (PEP 723), non è necessario creare virtualenv o installare manualmente le dipendenze. È sufficiente un solo comando!

1. Apri il terminale nella directory del progetto:
   ```bash
   cd /home/michele/Projects/ListaDellaSpesa
   ```

2. Avvia il server impostando la password di sicurezza personalizzata (se omessa, la password predefinita è `spesa123`):
   ```bash
   SPESA_PASS="LaTuaPasswordSegreta" uv run main.py
   ```

3. Apri il tuo browser e naviga su:
   [http://localhost:8000](http://localhost:8000)

4. Inserisci la password per sbloccare l'applicazione e avviare la sincronizzazione.

### Esecuzione con Docker

Il progetto include anche un `Dockerfile` e un esempio di `docker-compose.yml` per avviare l'app in container.

#### Opzione 1: usare l'immagine pubblica da GitHub Container Registry

```bash
docker pull ghcr.io/mifurlanetto/listadellaspesa:latest
```

#### Opzione 2: costruire localmente dal repository

1. Costruisci e avvia il container:
   ```bash
   docker compose up --build
   ```

2. Apri il browser su:
   [http://localhost:8000](http://localhost:8000)

3. La configurazione usa un volume Docker chiamato `spesa_data` per mantenere i dati persistenti dell'applicazione tra riavvii del container.

4. La password di accesso può essere impostata tramite la variabile d'ambiente `SPESA_PASS`:
   ```bash
   SPESA_PASS="LaTuaPasswordSegreta" docker compose up --build
   ```

---

## 📁 Struttura del Progetto

```text
ListaDellaSpesa/
├── .gitignore           # File per escludere file temporanei e database locali
├── database.db          # Database SQLite creato automaticamente all'avvio
├── main.py              # Server FastAPI, API di sync, autenticazione cookie e DB
├── README.md            # Questa guida
└── static/              # Asset statici dell'applicazione frontend
    ├── app.js           # Logica client-side, sync, TSP routing e stato offline
    ├── map-editor.js    # Editor grafico 2D del supermercato su Canvas HTML5
    ├── index.html       # Struttura della pagina, modali e modulo di login
    └── style.css        # Stili, responsive grid e animazioni
```

## 🔄 Protocollo di Sincronizzazione

La sincronizzazione si divide in due flussi paralleli:

1. **Sincronizzazione Articoli (`/api/sync`)**:
   - Richiede l'autenticazione tramite cookie.
   - Il client invia gli articoli modificati localmente dopo l'ultimo timestamp di sincronizzazione riuscita (`groceries_last_sync`).
   - Il server aggiorna gli elementi solo se il timestamp del client è maggiore di quello a database, ed invia indietro gli articoli modificati da altri utenti.
   - Gli elementi eliminati vengono ripuliti dal database locale non appena il server conferma la ricezione.

2. **Sincronizzazione Impostazioni (`/api/sync_settings`)**:
   - Richiede l'autenticazione tramite cookie.
   - Il client sincronizza a database le configurazioni dei supermercati (comprese le mappe) e delle categorie.
   - Permette a tutti i componenti del nucleo familiare (2 o 3 utenti) di condividere lo stesso layout della mappa e l'ordine delle corsie dei supermercati.

---

## 🏠 Integrazione con Home Assistant (API REST)

L'applicazione espone un set di API dedicate per permettere a **Home Assistant** (e ad altri sistemi di automazione come comandi vocali Assist, tag NFC o scorciatoie iOS/Android) di interagire direttamente con la lista della spesa.

### 🔑 Autenticazione

Puoi autenticare le chiamate API utilizzando una chiave API dedicata specificata nella variabile d'ambiente `SPESA_API_KEY`, oppure la password standard `SPESA_PASS` (default: `spesa123`).

L'API accetta il token in tre modalità:
- Header HTTP `Authorization: Bearer <TOKEN>` (Consigliato per Home Assistant)
- Header HTTP `X-API-Key: <TOKEN>`
- Query parameter nell'URL `?api_key=<TOKEN>`

---

### 📡 Endpoint Disponibili

#### 1. Aggiungi o Attiva Articolo (`POST /api/ha/items` o `/api/ha/add`)

Aggiunge un prodotto alla lista della spesa o riattiva un prodotto già presente nel catalogo.

**Payload JSON:**
```json
{
  "name": "Latte",
  "quantity": "2 bottiglie",
  "category": "Latticini",
  "needed": 1,
  "confirm": false
}
```
*Tutti i campi ad eccezione di `name` sono opzionali.*

**Comportamento e Gestione Conferma:**
- **Se l'articolo esiste già nel catalogo**: viene immediatamente impostato come da comprare (`needed = 1`) senza chiedere conferma, aggiornando la quantità se fornita. Risponde con:
  ```json
  {
    "status": "ok",
    "action": "added",
    "message": "'Latte' aggiunto alla lista della spesa",
    "item": { "id": "...", "name": "Latte", "quantity": "2 bottiglie", "category": "Latticini", "needed": 1 }
  }
  ```
- **Se l'articolo NON esiste e `confirm` è `false` (default)**: l'articolo **non** viene creato a sistema e l'API risponde richiedendo conferma:
  ```json
  {
    "status": "needs_confirmation",
    "exists": false,
    "name": "ProdottoSconosciuto",
    "message": "L'articolo 'ProdottoSconosciuto' non è presente nel catalogo. Invia 'confirm': true per crearlo e aggiungerlo alla lista."
  }
  ```
- **Se l'articolo NON esiste e `confirm` è `true`**: l'articolo viene inserito a catalogo con categorizzazione automatica (Smartwords) e aggiunto alla lista attiva:
  ```json
  {
    "status": "ok",
    "action": "created",
    "message": "Nuovo articolo 'ProdottoSconosciuto' creato (Dispensa) e aggiunto alla lista della spesa",
    "item": { ... }
  }
  ```

#### 2. Consulta Articoli da Comprare (`GET /api/ha/items`)

Restituisce l'elenco degli articoli presenti nella lista della spesa.

- Query param: `?needed_only=true` (default: `true`, mostra solo quelli da comprare; se `false`, mostra l'intero catalogo).

**Risposta JSON:**
```json
{
  "count": 2,
  "items": [
    { "id": "abc123", "name": "Latte", "quantity": "2 bottiglie", "category": "Latticini", "needed": 1 },
    { "id": "def456", "name": "Mele", "quantity": "1 kg", "category": "Ortofrutta", "needed": 1 }
  ]
}
```

#### 3. Segna Articolo come Acquistato / Rimosso (`POST /api/ha/complete`)

Segna un articolo come comprato (imposta `needed = 0`).

**Payload JSON:**
```json
{
  "name": "Latte"
}
```
*(Oppure `"id": "abc123"`)*

---

### ⚙️ Configurazione in Home Assistant

#### Esempio 1: `rest_command` in `configuration.yaml`

Aggiungi il comando REST per aggiungere articoli:

```yaml
rest_command:
  spesa_aggiungi:
    url: "http://<IP_O_HOST_SPESA>:8000/api/ha/items"
    method: POST
    headers:
      Authorization: "Bearer LaTuaChiaveApi"
      Content-Type: "application/json"
    payload: >-
      {
        "name": "{{ name }}",
        "quantity": "{{ quantity | default('', true) }}",
        "confirm": {{ confirm | default(false) | to_json }}
      }

  spesa_completa:
    url: "http://<IP_O_HOST_SPESA>:8000/api/ha/complete"
    method: POST
    headers:
      Authorization: "Bearer LaTuaChiaveApi"
      Content-Type: "application/json"
    payload: >-
      {
        "name": "{{ name }}"
      }
```

#### Esempio 2: Sensore REST per visualizzare gli articoli su Lovelace

```yaml
sensor:
  - platform: rest
    name: "Articoli Spesa da Comprare"
    resource: "http://<IP_O_HOST_SPESA>:8000/api/ha/items"
    headers:
      Authorization: "Bearer LaTuaChiaveApi"
    value_template: "{{ value_json.count }}"
    json_attributes:
      - items
    scan_interval: 60
```

Puoi visualizzarlo in una scheda Markdown di Home Assistant:
```yaml
type: markdown
title: 🛒 Lista della Spesa
content: >
  {% if state_attr('sensor.articoli_spesa_da_comprare', 'items') %}
    {% for item in state_attr('sensor.articoli_spesa_da_comprare', 'items') %}
      - **{{ item.name }}** {% if item.quantity %}({{ item.quantity }}){% endif %} - *{{ item.category }}*
    {% endfor %}
  {% else %}
    Nessun articolo da comprare!
  {% endif %}
```

#### Esempio 3: Test rapido da terminale (`curl`)

```bash
# Aggiunta elemento esistente
curl -X POST "http://localhost:8000/api/ha/items" \
  -H "Authorization: Bearer spesa123" \
  -H "Content-Type: application/json" \
  -d '{"name": "Latte", "quantity": "1L"}'

# Aggiunta con conferma forzata di nuovo prodotto
curl -X POST "http://localhost:8000/api/ha/items" \
  -H "Authorization: Bearer spesa123" \
  -H "Content-Type: application/json" \
  -d '{"name": "Prodotto Nuovo", "confirm": true}'

# Lettura lista attiva
curl -H "Authorization: Bearer spesa123" "http://localhost:8000/api/ha/items"
```

