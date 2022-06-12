import argparse
import sqlite3
import sys

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from databases import Database

from data_models.global_models import Project, Experiment, Environment, Dataset, TrackingItem, get_model_by_name
import data_handling.database_handler as db_handler

from routes import data, embedding

app = FastAPI(
    title="Test Python Backend",
    description="""This is a template for a Python backend.
                   It provides acess via REST API.""",
    version="0.1.0"
)
app.include_router(data.router)
app.include_router(embedding.router)

database = Database("sqlite:///test.db")

@app.on_event("startup")
async def startup():
    await database.connect()
    await db_handler.create_table_from_model(database, Project)
    await db_handler.create_table_from_model(database, Experiment)
    await db_handler.create_table_from_model(database, Environment)
    await db_handler.create_table_from_model(database, Dataset)
    await db_handler.create_table_from_model(database, TrackingItem)

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/",
         response_class=HTMLResponse,
         tags=["ROOT"])
async def root():
    html_content = """
        <html>
            <head>
                <title>RL Workbench</title>
            </head>
            <body>
                <h1>Test Python Backend</h1>
                Visit the <a href="/docs">API doc</a> (<a href="/redoc">alternative</a>) for usage information.
            </body>
        </html>
        """
    return HTMLResponse(content=html_content, status_code=200)


@app.get("/get_all", response_model=list[BaseModel], tags=["DATA"])
async def get_all(model_name: str):
    model = get_model_by_name(model_name)
    if model is None:
        return {"message": f"Model {model_name} not found."}
    return await db_handler.get_all(database, model)


@app.get("/get_data_by_id", response_model=BaseModel, tags=["DATA"])
async def get_data_by_id(model_name: str, item_id: int):
    model = get_model_by_name(model_name)
    if model is None:
        return {"message": f"Model {model_name} not found."}
    return await db_handler.get_single_entry(database, model, item_id)


@app.post("/add_data", response_model=BaseModel, tags=["DATA"])
async def add_data(model_name: str, data: dict):
    model = get_model_by_name(model_name)
    if model is None:
        return {"message": f"Model {model_name} not found."}
    await db_handler.add_entry(database, model, data)
    return {"message": f"Added {model_name}"}


@app.post("update_data", response_model=BaseModel, tags=["DATA"])
async def update_data(model_name: str, item_id: int, data: dict):
    model = get_model_by_name(model_name)
    if model is None:
        return {"message": f"Model {model_name} not found."}
    await db_handler.update_entry(database, model, item_id, data)
    return {"message": f"Updated {model_name} with id {item_id}"}


@app.delete("/delete_data", response_model=BaseModel, tags=["DATA"])
async def delete_data(model_name: str, item_id: int):
    model = get_model_by_name(model_name)
    if model is None:
        return {"message": f"Model {model_name} not found."}
    await db_handler.delete_entry(database, model, item_id)
    return {"message": f"Deleted {model_name} with id {item_id}"}


def main(args):
    parser = argparse.ArgumentParser(description='Test Python Backend')

    parser.add_argument('--port', type=int, default=8080, help='Port to run server on.')
    parser.add_argument('--dev', action='store_true',
                        help='If true, restart the server as changes occur to the code.')

    args = parser.parse_args(args)

    if args.dev:
        print(f"Serving on port {args.port} in development mode.")
        uvicorn.run("app:app", host="0.0.0.0", port=args.port, reload=True, access_log=False, workers=4)
    else:
        print(f"Serving on port {args.port} in live mode.")
        uvicorn.run("app:app", host="0.0.0.0", port=args.port, reload=False, access_log=False, workers=4)


if __name__ == "__main__":
    main(sys.argv[1:])
