import pandas as pd
import psycopg

from config import DATABASE_URL


def read_sql(query: str) -> pd.DataFrame:
    with psycopg.connect(DATABASE_URL) as conn, conn.cursor() as cur:
        cur.execute(query)
        columns = [c.name for c in cur.description]
        return pd.DataFrame(cur.fetchall(), columns=columns)
