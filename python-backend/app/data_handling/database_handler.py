from pydantic import BaseModel
from databases import Database

"""
    database_handler.py - Wrapper with static methods which wrap database access operations. For each method, the db
    connection has to be supplied

    Commonly used from Trainer & DataHandler/Server instances to make sure schemas are in sync
"""


def dict_factory(crs, row) -> dict:
    d = {}
    for idx, col in enumerate(crs.description):
        d[col[0]] = row[idx]
    return d


async def create_table_from_model(cursor: Database, model: type[BaseModel]) -> None:
    """
    Creates a new project table in the database dynamically based on the Project DataModel
    :param cursor: sqlite3.Cursor
    :param model: pydantics.BaseModel
    :return: None
    """
    table_name = model.__name__
    query = "CREATE TABLE IF NOT EXISTS "+table_name+" ("
    for field in model.__annotations__:
        if field == "id":
            query += "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        else:
            # If int type is not specified, default to TEXT
            if model.__annotations__[field] == int:
                query += field + " INTEGER,"
            else:
                query += field + " TEXT,"
    query = query[:-1] + ")"
    return await cursor.execute(query)


async def get_all(cursor: Database, model: type[BaseModel]) -> list[BaseModel]:
    """
    Returns all rows from a table with a given model
    :param cursor: sqlite3.Cursor
    :param model: pydantics.BaseModel
    :return: List[model]
    """
    table_name = model.__name__
    query = "SELECT * FROM "+table_name
    rows = await cursor.fetch_all(query)
    return [model(**{**row}) for row in rows]


async def get_single_entry(cursor: Database, model: type[BaseModel], id: int) -> BaseModel:
    """
    Returns a single entry from a table with a given model
    :param cursor: sqlite3.Cursor
    :param model: pydantics.BaseModel
    :param id: int
    :return: model
    """
    table_name = model.__name__
    query = "SELECT * FROM "+table_name+" WHERE id = "+str(id)
    row = await cursor.fetch_one(query)
    return model(**{**row})


async def add_entry(cursor: Database, model: type[BaseModel], data: dict) -> None:
    """
    Adds a single entry to a table with a given model
    :param cursor: sqlite3.Cursor
    :param model: pydantics.BaseModel
    :param data: dict
    :return: None
    """
    table_name = model.__name__
    default_model = model(id=-1)
    query = "INSERT INTO "+table_name+" ("
    for field in model.__annotations__:
        if field == "id":
            continue
        query += field + ","
    query = query[:-1] + ") VALUES ("
    # for each field not in data, take default from data model
    for field in model.__annotations__:
        if field == "id":
            continue
        if field not in data:
            if model.__annotations__[field] == int:
                query += str(default_model.__getattribute__(field)) + ","
            elif model.__annotations__[field] == dict:
                query += "'" + str(default_model.__getattribute__(field)) + "',"
            elif model.__annotations__[field] == list:
                query += "'" + str(default_model.__getattribute__(field)) + "',"
            else:
                query += "'" + default_model.__getattribute__(field) + "'" + ","
        elif field in data:
            if model.__annotations__[field] == int:
                query += field + "=" + str(data[field]) + ","
            elif model.__annotations__[field] == dict:
                query += "'" + str(data[field]) + "',"
            elif model.__annotations__[field] == list:
                query += "'" + str(data[field]) + "',"
            else:
                query += field + "='" + str(data[field]) + "',"
    query = query[:-1] + ")"
    print(query)
    await cursor.execute(query)


async def update_entry(cursor: Database, model: type[BaseModel], id: int, data: dict) -> None:
    """
    Updates a single entry from a table with a given model
    :param cursor: sqlite3.Cursor
    :param model: pydantics.BaseModel
    :param id: int
    :param data: dict
    :return: None
    """
    table_name = model.__name__
    query = "UPDATE "+table_name+" SET "
    for field in data:
        if model.__annotations__[field] == int:
            query += field + "=" + str(data[field]) + ","
        elif model.__annotations__[field] == dict:
            query += "'" + str(data[field]) + "',"
        elif model.__annotations__[field] == list:
            query += "'" + str(data[field]) + "',"
        else:
            query += field + "='" + str(data[field]) + "',"
    query = query[:-1] + " WHERE id = "+str(id)
    await cursor.execute(query)


async def delete_entry(cursor: Database, model: type[BaseModel], id: int) -> None:
    """
    Deletes a single entry from a table with a given model
    :param cursor: sqlite3.Cursor
    :param model: pydantics.BaseModel
    :param id: int
    :return: None
    """
    table_name = model.__name__
    query = "DELETE FROM "+table_name+" WHERE id = "+str(id)
    await cursor.execute(query)





