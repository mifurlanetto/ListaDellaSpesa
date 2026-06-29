# /// script
# dependencies = [
#   "fastapi",
#   "uvicorn",
# ]
# ///

import os
import sqlite3
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
