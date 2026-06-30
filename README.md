# ListaDellaSpesa 🍊

Una web application per la lista della spesa condivisa, progettata specificamente per essere semplice, leggera e resiliente alle interruzioni di connettività (**offline-first**). Ottimizzata per 2 o 3 utenti.

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

- **Offline-First & Auto-Sync (Articoli + Impostazioni)**: Puoi compilare la lista o deselezionare elementi anche nei supermercati senza segnale internet. L'app salva tutto localmente tramite `localStorage` e risincronizza le modifiche in background non appena la connettività si ripristina. Oltre agli articoli, l'app sincronizza anche la configurazione dei supermercati e delle categorie.
- **Gestione Multi-Supermercato**: Puoi definire molteplici supermercati (es. "Coop", "Esselunga", "Lidl") e configurare per ciascuno di essi un ordine personalizzato delle corsie per facilitare il percorso all'interno del punto vendita.
- **Categorie e Smartwords Personalizzabili**: Puoi creare, modificare ed eliminare le categorie merceologiche direttamente dal menu. Ciascuna categoria supporta un elenco di "Smartwords" (parole chiave) personalizzabili: digitando un nuovo prodotto, l'app lo assegnerà in automatico alla categoria corretta se il nome contiene una delle parole chiave.
- **Risoluzione dei Conflitti Semplice**: Utilizza un meccanismo di sincronizzazione basato su timestamps con logica *Last-Write-Wins* (L'ultima scrittura vince).
- **Interfaccia Grafica Premium**: Un design moderno e responsive ottimizzato per smartphone con tema scuro, elementi in stile *glassmorphism*, badge luminosi per lo stato della connessione/sincronizzazione ed animazioni fluide.

## 🛠️ Stack Tecnologico

- **Backend**: Python 3 con **FastAPI** e **SQLite**.
- **Frontend**: Single Page Application (SPA) in HTML5, JavaScript (ES6) e Vanilla CSS3 con Google Fonts e FontAwesome.
- **Gestore Dipendenze**: `uv` per un'esecuzione rapida e senza configurazioni complesse.

## 🚀 Come Eseguire l'Applicazione

Visto l'utilizzo di `uv` e dei metadati in linea dello script (PEP 723), non è necessario creare virtualenv o installare manualmente le dipendenze. È sufficiente un solo comando!

1. Apri il terminale nella directory del progetto:
   ```bash
   cd /home/michele/Projects/ListaDellaSpesa
   ```

2. Avvia il server:
   ```bash
   uv run main.py
   ```

3. Apri il tuo browser e naviga su:
   [http://localhost:8000](http://localhost:8000)

*(Se la porta 8000 è occupata, puoi modificare la porta direttamente in fondo a `main.py`).*

## 📁 Struttura del Progetto

```text
ListaDellaSpesa/
├── .gitignore           # File per escludere file temporanei e database locali
├── database.db          # Database SQLite creato automaticamente all'avvio
├── main.py              # Server FastAPI, API di sincronizzazione e gestione DB
├── README.md            # Questa guida
└── static/              # Asset statici dell'applicazione frontend
    ├── app.js           # Logica client-side, sync e stato offline
    ├── index.html       # Struttura della pagina e modali
    └── style.css        # Stili, responsive grid e animazioni
```

## 🔄 Protocollo di Sincronizzazione

La sincronizzazione si divide in due flussi paralleli:

1. **Sincronizzazione Articoli (`/api/sync`)**:
   - Il client invia gli articoli modificati localmente dopo l'ultimo timestamp di sincronizzazione riuscita (`groceries_last_sync`).
   - Il server aggiorna gli elementi solo se il timestamp del client è maggiore di quello a database, ed invia indietro gli articoli modificati da altri utenti.
   - Gli elementi eliminati vengono purificati dal database locale non appena il server conferma la ricezione.

2. **Sincronizzazione Impostazioni (`/api/sync_settings`)**:
   - Il client sincronizza a database le configurazioni dei supermercati e delle categorie (salvate come stringhe JSON con logica Last-Write-Wins).
   - Questo permette a tutti i componenti del nucleo familiare (2 o 3 utenti) di condividere lo stesso catalogo di categorie ed elenchi di supermercati con relativo ordinamento corsie.
