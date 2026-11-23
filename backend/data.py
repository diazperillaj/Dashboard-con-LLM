"""ETL: unifica los CSV crudos de disponibilidad en un único dataset normalizado.

Cada CSV crudo tiene una sola fila de datos; cada columna (además de las
columnas de metadatos) es un timestamp con formato ``Fri Feb 06 2026 14:01:10``
y su valor es el número de tiendas activas en ese instante.

El resultado es un CSV largo ``timestamp,value,origin_file`` ordenado
cronológicamente, sin nulos ni duplicados y con timestamps en ISO-8601.

Uso:
    python data.py                              # valores por defecto
    python data.py --input ../Data/Archivo --output app/data/availability.csv
"""

import argparse
import glob
import os
import re

import pandas as pd

DEFAULT_INPUT = "../Data/Archivo"
DEFAULT_OUTPUT = "app/data/availability.csv"

META_COLS = {
    "Plot name",
    "metric (sf_metric)",
    "Value Prefix",
    "Value Suffix",
}

# Extrae solo la parte "Fri Feb 06 2026 14:01:10" del encabezado de columna.
DATE_REGEX = re.compile(
    r"^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}"
)


def extract_rows(csv_folder: str) -> list[dict]:
    """Convierte cada CSV crudo (formato ancho) en filas largas."""
    rows: list[dict] = []

    for file_path in sorted(glob.glob(os.path.join(csv_folder, "*.csv"))):
        name = os.path.basename(file_path)
        try:
            df = pd.read_csv(file_path)
            if df.empty:
                print(f"VACIO -> {name}")
                continue

            first_row = df.iloc[0]
            for raw_timestamp in df.columns:
                if raw_timestamp in META_COLS:
                    continue
                match = DATE_REGEX.search(raw_timestamp)
                if not match:
                    continue
                rows.append({
                    "timestamp": match.group(0),
                    "value": first_row[raw_timestamp],
                    "origin_file": name,
                })
            print(f"OK    -> {name}")
        except Exception as exc:  # noqa: BLE001 — un archivo corrupto no detiene el lote
            print(f"ERROR -> {name}: {exc}")

    return rows


def clean(rows: list[dict]) -> pd.DataFrame:
    """Tipa, limpia, deduplica y ordena las lecturas."""
    df = pd.DataFrame(rows)
    print("Filas antes de limpieza:", len(df))

    df["timestamp"] = pd.to_datetime(
        df["timestamp"], format="%a %b %d %Y %H:%M:%S", errors="coerce"
    )
    df["value"] = pd.to_numeric(df["value"], errors="coerce")

    df = (
        df.dropna(subset=["timestamp", "value"])
          .drop_duplicates(subset=["timestamp", "value"])
          .sort_values("timestamp")
          .reset_index(drop=True)
    )
    df["value"] = df["value"].astype("int64")
    df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%S")

    print("Filas finales:", len(df))
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--input", default=DEFAULT_INPUT, help="Carpeta con los CSV crudos")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Ruta del CSV unificado")
    args = parser.parse_args()

    rows = extract_rows(args.input)
    if not rows:
        raise SystemExit(f"No se encontraron lecturas válidas en '{args.input}'.")

    df = clean(rows)
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    df.to_csv(args.output, index=False)
    print(f"Archivo generado: {args.output}")


if __name__ == "__main__":
    main()
