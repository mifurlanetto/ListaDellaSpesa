# /// script
# dependencies = [
#   "fastapi",
#   "uvicorn",
#   "python-multipart",
#   "requests",
# ]
# ///

import os
import sqlite3
import time
import json
import uuid
import requests
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request, Response, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, HTMLResponse
from pydantic import BaseModel

# Initialize database
data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
if not os.path.exists(data_dir):
    os.makedirs(data_dir)
DB_PATH = os.path.join(data_dir, "database.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if the old table exists with the 'bought' column
    cursor.execute("PRAGMA table_info(grocery_items)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if columns and "bought" in columns and "needed" not in columns:
        # Recreate the table for the new schema (needed instead of bought)
        cursor.execute("DROP TABLE grocery_items")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS grocery_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            quantity TEXT,
            category TEXT,
            needed INTEGER DEFAULT 0,
            deleted INTEGER DEFAULT 0,
            updated_at REAL NOT NULL
        )
    """)
    # Add index on updated_at for fast sync querying
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_grocery_updated_at ON grocery_items(updated_at)")
    
    # Table for app settings (categories, supermarkets)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at REAL NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()

init_db()

app = FastAPI(title="ListaDellaSpesa API")

PASSWORD = os.environ.get("SPESA_PASS", "spesa123")
API_KEY = os.environ.get("SPESA_API_KEY", PASSWORD)
AUTH_COOKIE = "spesa_auth"

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Exclude login routes, static assets, openapi docs and status
    if request.url.path in ["/login", "/api/status", "/favicon.ico", "/docs", "/openapi.json"]:
        return await call_next(request)
        
    # 1. Check session cookie
    cookie = request.cookies.get(AUTH_COOKIE)
    if cookie == PASSWORD:
        return await call_next(request)
        
    # 2. Check token / API key (Bearer token, X-API-Key header, or ?api_key query param)
    auth_header = request.headers.get("Authorization")
    api_key_header = request.headers.get("X-API-Key")
    query_key = request.query_params.get("api_key")
    
    token = None
    if auth_header:
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
        else:
            token = auth_header.strip()
    elif api_key_header:
        token = api_key_header.strip()
    elif query_key:
        token = query_key.strip()
        
    valid_keys = {PASSWORD}
    if API_KEY:
        valid_keys.add(API_KEY)
        
    if token and token in valid_keys:
        return await call_next(request)
        
    if request.url.path.startswith("/api/"):
        return Response(status_code=401, content="Unauthorized")
    return RedirectResponse(url="/login")

@app.get("/login", response_class=HTMLResponse)
def login_page(error: int = 0):
    error_msg = "<p style='color: #ef4444; margin-bottom: 1rem;'>Password errata.</p>" if error else ""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login - ListaDellaSpesa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{ font-family: sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
            .login-box {{ background: #1e293b; padding: 2.5rem; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 320px; }}
            input {{ padding: 0.75rem; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; margin-bottom: 1rem; width: 100%; box-sizing: border-box; font-size: 1rem; outline: none; }}
            input:focus {{ border-color: #f59e0b; }}
            button {{ background: #f59e0b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; font-size: 1rem; transition: background 0.2s; }}
            button:hover {{ background: #d97706; }}
            h2 {{ margin-top: 0; margin-bottom: 1.5rem; }}
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>Lista della Spesa 🍊</h2>
            {error_msg}
            <form method="POST" action="/login">
                <input type="password" name="password" placeholder="Inserisci Password" required autofocus>
                <button type="submit">Entra</button>
            </form>
        </div>
    </body>
    </html>
    """

@app.post("/login")
async def do_login(password: str = Form(...)):
    if password == PASSWORD:
        response = RedirectResponse(url="/", status_code=303)
        response.set_cookie(key=AUTH_COOKIE, value=password, max_age=31536000, httponly=True, samesite="Lax")
        return response
    else:
        return RedirectResponse(url="/login?error=1", status_code=303)

class GroceryItem(BaseModel):
    id: str
    name: str
    quantity: Optional[str] = ""
    category: Optional[str] = "Uncategorized"
    needed: int
    deleted: int
    updated_at: float

class SyncRequest(BaseModel):
    client_last_sync: float
    changes: List[GroceryItem]

class SyncResponse(BaseModel):
    server_time: float
    updates: List[GroceryItem]

@app.post("/api/sync", response_model=SyncResponse)
def sync_groceries(payload: SyncRequest):
    server_time = time.time() * 1000  # current time in ms
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # 1. Process client changes (Last-Write-Wins)
        for item in payload.changes:
            # Check if item exists in db
            cursor.execute("SELECT updated_at FROM grocery_items WHERE id = ?", (item.id,))
            row = cursor.fetchone()
            
            if row is None:
                # Insert new item
                cursor.execute("""
                    INSERT INTO grocery_items (id, name, quantity, category, needed, deleted, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (item.id, item.name, item.quantity, item.category, item.needed, item.deleted, item.updated_at))
            else:
                db_updated_at = row["updated_at"]
                # If client's update is newer, overwrite database
                if item.updated_at > db_updated_at:
                    cursor.execute("""
                        UPDATE grocery_items
                        SET name = ?, quantity = ?, category = ?, needed = ?, deleted = ?, updated_at = ?
                        WHERE id = ?
                    """, (item.name, item.quantity, item.category, item.needed, item.deleted, item.updated_at, item.id))
        
        conn.commit()
        
        # 2. Get updates from server since client's last sync time
        cursor.execute("""
            SELECT id, name, quantity, category, needed, deleted, updated_at 
            FROM grocery_items 
            WHERE updated_at > ?
        """, (payload.client_last_sync,))
        
        updates = []
        for row in cursor.fetchall():
            updates.append(GroceryItem(
                id=row["id"],
                name=row["name"],
                quantity=row["quantity"],
                category=row["category"],
                needed=row["needed"],
                deleted=row["deleted"],
                updated_at=row["updated_at"]
            ))
            
        return SyncResponse(server_time=server_time, updates=updates)
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class SettingItem(BaseModel):
    key: str
    value: str
    updated_at: float

class SyncSettingsRequest(BaseModel):
    client_last_sync: float
    changes: List[SettingItem]

class SyncSettingsResponse(BaseModel):
    server_time: float
    updates: List[SettingItem]

@app.post("/api/sync_settings", response_model=SyncSettingsResponse)
def sync_settings(payload: SyncSettingsRequest):
    server_time = time.time() * 1000
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # 1. Process client changes
        for item in payload.changes:
            cursor.execute("SELECT updated_at FROM app_settings WHERE key = ?", (item.key,))
            row = cursor.fetchone()
            
            if row is None:
                cursor.execute("""
                    INSERT INTO app_settings (key, value, updated_at)
                    VALUES (?, ?, ?)
                """, (item.key, item.value, item.updated_at))
            else:
                db_updated_at = row["updated_at"]
                if item.updated_at > db_updated_at:
                    cursor.execute("""
                        UPDATE app_settings
                        SET value = ?, updated_at = ?
                        WHERE key = ?
                    """, (item.value, item.updated_at, item.key))
        
        conn.commit()
        
        # 2. Get updates from server
        cursor.execute("""
            SELECT key, value, updated_at 
            FROM app_settings 
            WHERE updated_at > ?
        """, (payload.client_last_sync,))
        
        updates = []
        for row in cursor.fetchall():
            updates.append(SettingItem(
                key=row["key"],
                value=row["value"],
                updated_at=row["updated_at"]
            ))
            
        return SyncSettingsResponse(server_time=server_time, updates=updates)
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class MandarineImportRequest(BaseModel):
    couchdb_url: str
    username: str
    password: str
    database_name: str

@app.post("/api/fetch_mandarine_db")
def fetch_mandarine_db(payload: MandarineImportRequest):
    url = f"{payload.couchdb_url.rstrip('/')}/{payload.database_name}/_all_docs?include_docs=true"
    try:
        resp = requests.get(url, auth=(payload.username, payload.password), timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Errore di connessione a CouchDB: {str(e)}")

@app.get("/api/status")
def status():
    return {"status": "ok", "time": time.time() * 1000}

# --- Home Assistant & External Automation API ---

DEFAULT_CATEGORIES_KEYWORDS = {
    "Ortofrutta": ['mela', 'mele', 'banana', 'banane', 'clementine', 'mandar', 'aranc', 'limon', 'pomodor', 'insalata', 'carot', 'patat', 'cipoll', 'aglio', 'verdur', 'frutt', 'fragol', 'pesch', 'zucchine', 'melanzan', 'spinaci', 'basilico', 'insalat', 'pero', 'pere', 'uva', 'ananas', 'kiwi', 'funghi', 'sedano', 'prezzemolo', 'zucca', 'peperon', 'broccoli', 'cavolo'],
    "Gastronomia": ['prosciutto', 'salame', 'mortadella', 'bresaola', 'speck', 'pancetta', 'affettat', 'olive', 'formaggio al banco', 'mozzarella di bufala'],
    "Macelleria": ['pollo', 'manzo', 'maiale', 'carne', 'petto', 'tacchino', 'bistecca', 'hamburger', 'cotoletta', 'macinato', 'salsiccia', 'fettine', 'arrost'],
    "Pescheria": ['pesce', 'salmone', 'tonno fresco', 'sgombro', 'merluzzo', 'gamber', 'calamar', 'branzino', 'orata', 'cozze', 'vongole', 'polpo'],
    "Latticini": ['latte', 'uovo', 'uova', 'formagg', 'mozzarella', 'parmigiano', 'grana', 'yogurt', 'burro', 'panna', 'ricotta', 'gorgonzola', 'pecorino', 'stracchino', 'mascarpone', 'margarina', 'pasta fresca', 'gnocchi', 'tortellini', 'ravioli'],
    "Panetteria": ['pane', 'focaccia', 'pizza', 'piadina', 'panino', 'grissini', 'taralli', 'baguette'],
    "Dispensa": ['pasta', 'riso', 'farina', 'sale', 'olio', 'aceto', 'sugo', 'salsa', 'passata', 'pesto', 'tonno in scatola', 'legumi', 'fagioli', 'ceci', 'lenticchie', 'dado', 'maionese', 'ketchup', 'spezie', 'pepe', 'origano', 'lievito', 'pane bauletto', 'crackers'],
    "Colazione": ['zucchero', 'caffe', 'caffè', 'the', 'tè', 'camomilla', 'cereali', 'miele', 'marmellata', 'cioccolato', 'biscott', 'torta', 'brioche', 'croissant', 'fette biscottate', 'merendine', 'nutella', 'cioccolatini', 'caramelle', 'snack', 'patatine'],
    "Bevande": ['acqua', 'birra', 'vino', 'coca', 'fanta', 'sprite', 'succo', 'cola', 'bevanda', 'aranciata', 'tassoni', 'gassosa', 'red bull', 'prosecco', 'spumante', 'tonic', 'aperol'],
    "Surgelati": ['gelato', 'surgelat', 'piselli surgelati', 'pizza surgelata', 'bastoncini', 'patatine fritte', 'congelat', 'sorbetto', 'sofficini', 'spinaci surgelati'],
    "Igiene": ['sapone', 'shampoo', 'bagnoschiuma', 'dentifricio', 'spazzolino', 'deodorante', 'assorbenti', 'rasoio', 'schiuma da barba', 'crema', 'balsamo', 'carta igienica', 'fazzoletti'],
    "Casa": ['scottex', 'detersivo', 'candeggina', 'sgrassatore', 'sacchetti', 'ammorbidente', 'piatti', 'lavatrice', 'spugna', 'panni', 'alluminio', 'pellicola', 'carta forno', 'lavastoviglie', 'pavimenti', 'vetri'],
    "Animali": ['croccantini', 'scatolette', 'cane', 'cani', 'gatto', 'gatti', 'lettiera', 'cibo animali'],
}

def predict_category(item_name: str, cursor: Optional[sqlite3.Cursor] = None) -> str:
    clean_name = item_name.lower().strip()
    if len(clean_name) < 3:
        return "Uncategorized"
        
    categories_dict = {}
    if cursor:
        try:
            cursor.execute("SELECT value FROM app_settings WHERE key = 'categories'")
            row = cursor.fetchone()
            if row:
                val = row["value"] if isinstance(row, sqlite3.Row) else row[0]
                categories_dict = json.loads(val)
        except Exception:
            pass
            
    modifiers = ['Surgelati', 'Animali', 'Bevande', 'Igiene', 'Casa']
    
    if categories_dict:
        other_cats = [k for k in categories_dict.keys() if k not in modifiers]
        priority_order = [m for m in modifiers if m in categories_dict] + other_cats
        for cat_id in priority_order:
            cat_data = categories_dict.get(cat_id)
            if not cat_data:
                continue
            keywords = cat_data.get("keywords", [])
            for kw in keywords:
                if kw.lower() in clean_name:
                    return cat_id
    else:
        other_cats = [k for k in DEFAULT_CATEGORIES_KEYWORDS.keys() if k not in modifiers]
        priority_order = modifiers + other_cats
        for cat_id in priority_order:
            keywords = DEFAULT_CATEGORIES_KEYWORDS.get(cat_id, [])
            for kw in keywords:
                if kw.lower() in clean_name:
                    return cat_id
                    
    return "Uncategorized"

class HAAddItemRequest(BaseModel):
    name: str
    quantity: Optional[str] = ""
    category: Optional[str] = None
    needed: Optional[int] = 1
    confirm: Optional[bool] = False

@app.post("/api/ha/items")
@app.post("/api/ha/add")
def ha_add_item(payload: HAAddItemRequest):
    item_name = payload.name.strip()
    if not item_name:
        raise HTTPException(status_code=400, detail="Il campo 'name' non può essere vuoto")
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    now_ms = time.time() * 1000
    
    try:
        # Check if item exists in catalog (case-insensitive)
        cursor.execute("SELECT id, name, quantity, category, needed, deleted FROM grocery_items WHERE LOWER(name) = LOWER(?)", (item_name,))
        row = cursor.fetchone()
        
        if row is not None:
            # Item already exists in catalog -> activate it
            item_id = row["id"]
            new_qty = payload.quantity.strip() if payload.quantity and payload.quantity.strip() else (row["quantity"] or "")
            new_cat = payload.category.strip() if payload.category and payload.category.strip() else (row["category"] or "Uncategorized")
            needed_val = payload.needed if payload.needed is not None else 1
            
            cursor.execute("""
                UPDATE grocery_items
                SET name = ?, quantity = ?, category = ?, needed = ?, deleted = 0, updated_at = ?
                WHERE id = ?
            """, (row["name"], new_qty, new_cat, needed_val, now_ms, item_id))
            conn.commit()
            
            return {
                "status": "ok",
                "action": "added",
                "message": f"'{row['name']}' aggiunto alla lista della spesa",
                "item": {
                    "id": item_id,
                    "name": row["name"],
                    "quantity": new_qty,
                    "category": new_cat,
                    "needed": needed_val,
                    "deleted": 0,
                    "updated_at": now_ms
                }
            }
        else:
            # Item does not exist in catalog
            if not payload.confirm:
                return {
                    "status": "needs_confirmation",
                    "exists": False,
                    "name": item_name,
                    "message": f"L'articolo '{item_name}' non è presente nel catalogo. Invia 'confirm': true per crearlo e aggiungerlo alla lista."
                }
                
            # Confirmed: create new item
            new_id = uuid.uuid4().hex[:10]
            qty = payload.quantity.strip() if payload.quantity else ""
            cat = payload.category.strip() if payload.category and payload.category.strip() else predict_category(item_name, cursor)
            needed_val = payload.needed if payload.needed is not None else 1
            
            cursor.execute("""
                INSERT INTO grocery_items (id, name, quantity, category, needed, deleted, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, ?)
            """, (new_id, item_name, qty, cat, needed_val, now_ms))
            conn.commit()
            
            return {
                "status": "ok",
                "action": "created",
                "message": f"Nuovo articolo '{item_name}' creato ({cat}) e aggiunto alla lista della spesa",
                "item": {
                    "id": new_id,
                    "name": item_name,
                    "quantity": qty,
                    "category": cat,
                    "needed": needed_val,
                    "deleted": 0,
                    "updated_at": now_ms
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/ha/items")
def ha_get_items(needed_only: bool = True):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        if needed_only:
            cursor.execute("SELECT id, name, quantity, category, needed, updated_at FROM grocery_items WHERE deleted = 0 AND needed = 1 ORDER BY category, name")
        else:
            cursor.execute("SELECT id, name, quantity, category, needed, updated_at FROM grocery_items WHERE deleted = 0 ORDER BY category, name")
            
        rows = cursor.fetchall()
        items_list = [
            {
                "id": r["id"],
                "name": r["name"],
                "quantity": r["quantity"] or "",
                "category": r["category"] or "Uncategorized",
                "needed": r["needed"],
                "updated_at": r["updated_at"]
            }
            for r in rows
        ]
        return {
            "count": len(items_list),
            "items": items_list
        }
    finally:
        conn.close()

class HACompleteItemRequest(BaseModel):
    name: Optional[str] = None
    id: Optional[str] = None

@app.post("/api/ha/complete")
@app.post("/api/ha/items/complete")
def ha_complete_item(payload: HACompleteItemRequest):
    if not payload.name and not payload.id:
        raise HTTPException(status_code=400, detail="Specificare 'name' o 'id' dell'articolo da completare")
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    now_ms = time.time() * 1000
    try:
        if payload.id:
            cursor.execute("SELECT id, name, quantity, category FROM grocery_items WHERE id = ? AND deleted = 0", (payload.id,))
        else:
            cursor.execute("SELECT id, name, quantity, category FROM grocery_items WHERE LOWER(name) = LOWER(?) AND deleted = 0", (payload.name.strip(),))
            
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Articolo non trovato")
            
        item_id = row["id"]
        cursor.execute("UPDATE grocery_items SET needed = 0, updated_at = ? WHERE id = ?", (now_ms, item_id))
        conn.commit()
        return {
            "status": "ok",
            "action": "completed",
            "message": f"'{row['name']}' rimosso dalla lista della spesa",
            "item_id": item_id
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# Serve static files from static directory if it exists
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# Catch-all route to serve index.html for UI
@app.get("/")
def read_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "ListaDellaSpesa backend is running. Please create static/index.html to view UI."}

# Mount static files
app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
