# ListaDellaSpesa 🍊

Una web application per la lista della spesa condivisa, progettata specificamente per essere semplice, leggera e resiliente alle interruzioni di connettività (**offline-first**). Ottimizzata per 2 o 3 utenti.

## 🔄 Il Flusso di Lavoro (Workflow)

L'applicazione è strutturata in due schede principali pensate per le diverse fasi della spesa:

1. **📋 Catalogo Articoli (Fase di Compilazione)**:
   - Contiene il database storico di tutti i tuoi articoli abituali (es. Latte, Pane, Clementine).
   - Quando prepari la lista da casa, ti basta scorrere il catalogo e **selezionare (togliere la spunta spenta per farla diventare arancione)** gli articoli che ti servono. 
   - Gli articoli selezionati (`needed = 1`) compariranno automaticamente nella scheda della spesa.

2. **🛒 Da Comprare (Fase di Spesa al Supermercato)**:
   - Mostra solo gli articoli selezionati per l'acquisto corrente, ordinati e raggruppati per corsia/categoria (es. Ortofrutta, Latticini).
   - Quando sei nel negozio e metti un articolo nel carrello fisicamente, ti basta **deselezionarlo (tapparci sopra)**. L'articolo sfumerà e scivolerà fuori dalla lista attiva, tornando nel catalogo come non selezionato (`needed = 0`) per la prossima volta. Non serve cancellare e riscrivere i prodotti ogni settimana!

---

## 🌟 Caratteristiche Principali

- **Offline-First & Auto-Sync**: Puoi compilare o deselezionare elementi anche nei punti vendita senza segnale internet. L'app salva tutto localmente tramite `localStorage` e risisincronizza le modifiche in background non appena la connettività si ripristina.
- **Rilevamento Categorie Intelligente**: Durante la digitazione di un nuovo prodotto, l'app analizza le parole chiave inserite (es. "latte", "mele", "pane") e lo assegna automaticamente alla categoria corretta (Ortofrutta, Latticini, Dispensa, ecc.) senza costringerti a sceglierla a mano.
- **Interfaccia Grafica Premium**: Un design moderno e responsive ottimizzato per smartphone con tema scuro, elementi in stile *glassmorphism*, badge luminosi per lo stato della connessione/sincronizzazione ed animazioni fluide.
- **Risoluzione dei Conflitti Semplice**: Utilizza un meccanismo di sincronizzazione basato su timestamps con logica *Last-Write-Wins* (L'ultima scrittura vince).
- **Pulizia Automatica**: Per mantenere lo spazio di archiviazione locale del browser minimo, gli articoli eliminati definitivamente dal catalogo vengono rimossi da `localStorage` non appena il server conferma la ricezione della loro eliminazione.

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
├── database.db          # Database SQLite creato automaticamente all'avvio
├── main.py              # Server FastAPI, API di sincronizzazione e gestione DB
├── README.md            # Questa guida
└── static/              # Asset statici dell'applicazione frontend
    ├── app.js           # Logica client-side, sync e stato offline
    ├── index.html       # Struttura della pagina e modali
    └── style.css        # Stili, responsive grid e animazioni
```

## 🔄 Protocollo di Sincronizzazione

1. **Stato Locale**: Il client mantiene in `localStorage` l'elenco degli articoli attivi, modificati o contrassegnati come eliminati (`deleted: 1`), oltre all'ultimo timestamp di sincronizzazione riuscita (`last_sync_time`).
2. **Push delle Modifiche**: Il client invia periodicamente o al cambio di rete tutte le modifiche locali aventi `updated_at > last_sync_time`.
3. **Merge sul Server**: Il server riceve le modifiche e le inserisce/aggiorna nel database SQLite solo se il timestamp del client è più recente di quello già presente a DB per quell'articolo.
4. **Pull delle Modifiche**: Il server restituisce al client tutti gli articoli modificati da chiunque altro dopo il `last_sync_time` del client.
5. **Risoluzione e Pulizia**: Il client unisce le modifiche ricevute e rimuove localmente tutti gli articoli con `deleted: 1` che sono stati registrati con successo a DB (in quanto sia il server che gli altri client ne sono ora a conoscenza).
