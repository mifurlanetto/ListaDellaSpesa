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
import requests
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request, Response, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, HTMLResponse
from pydantic import BaseModel

# Initialize database
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")

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
AUTH_COOKIE = "spesa_auth"

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Exclude login routes and static assets when not authenticated
    if request.url.path in ["/login", "/api/status", "/favicon.ico"]:
        return await call_next(request)
        
    # Check cookie
    cookie = request.cookies.get(AUTH_COOKIE)
    if cookie != PASSWORD:
        if request.url.path.startswith("/api/"):
            return Response(status_code=401, content="Unauthorized")
        return RedirectResponse(url="/login")
        
    return await call_next(request)

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
