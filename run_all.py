"""Lanzador de la tienda: levanta los 3 microservicios y el gateway con la interfaz.

    python run_all.py

Con la interfaz abierta (http://localhost:8000) puedes escribir en esta consola:
    detener productos   -> simula la caída de un servicio
    iniciar productos   -> lo vuelve a levantar
    estado | salir
"""
import os
import subprocess
import sys
import time
from pathlib import Path

import httpx

RAIZ = Path(__file__).resolve().parent
PUERTOS = {"productos": 8001, "clientes": 8002, "pedidos": 8003, "gateway": 8000}
ORDEN = ["productos", "clientes", "pedidos", "gateway"]
ENTORNO = {**os.environ, "PYTHONPATH": str(RAIZ)}   # garantiza que se encuentren los paquetes
procesos: dict[str, subprocess.Popen] = {}


def verificar_estructura() -> None:
    faltan = [n for n in ORDEN if not (RAIZ / n / "main.py").exists()]
    if faltan:
        sys.exit("Faltan las carpetas: " + ", ".join(faltan) +
                 "\nDescomprime el .zip completo y ejecuta run_all.py desde dentro de la carpeta 'tienda'.")


def verificar_estructura() -> None:
    faltan = [n for n in ORDEN if not (RAIZ / n / "main.py").exists()]
    if faltan:
        sys.exit(
            "ERROR: faltan las carpetas/archivos de: " + ", ".join(faltan) + "\n"
            f"Se buscaron en: {RAIZ}\n"
            "Descarga y descomprime el proyecto completo (tienda.zip) conservando las carpetas."
        )


def iniciar(nombre: str) -> None:
    if nombre in procesos:
        return
    procesos[nombre] = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", f"{nombre}.main:app",
         "--host", "0.0.0.0", "--port", str(PUERTOS[nombre]), "--log-level", "warning"],
        cwd=RAIZ, env=ENTORNO,
    )


def detener(nombre: str) -> None:
    proceso = procesos.pop(nombre, None)
    if proceso:
        proceso.terminate()
        proceso.wait()


def esperar(nombre: str, segundos: int = 20) -> None:
    for _ in range(segundos * 4):
        try:
            if httpx.get(f"http://localhost:{PUERTOS[nombre]}/health", timeout=1).is_success:
                return
        except httpx.RequestError:
            time.sleep(0.25)
    raise RuntimeError(f"El servicio {nombre} no respondió en el puerto {PUERTOS[nombre]}")


def iniciar_todos() -> None:
    verificar_estructura()
    for nombre in ORDEN:
        iniciar(nombre)
    for nombre in ORDEN:
        esperar(nombre)


def detener_todos() -> None:
    for nombre in list(procesos):
        detener(nombre)


def consola() -> None:
    while True:
        try:
            partes = input("> ").strip().split()
        except (EOFError, KeyboardInterrupt):
            return
        if not partes:
            continue
        orden, nombre = partes[0], (partes[1] if len(partes) > 1 else "")
        if orden == "salir":
            return
        if orden == "estado":
            print({n: n in procesos for n in ORDEN})
        elif orden in ("iniciar", "detener") and nombre in PUERTOS:
            (iniciar if orden == "iniciar" else detener)(nombre)
            print(f"{nombre}: {'iniciado' if orden == 'iniciar' else 'detenido'}")
        else:
            print("Comandos: detener <servicio> | iniciar <servicio> | estado | salir")


def main() -> None:
    verificar_estructura()
    iniciar_todos()
    print("Tienda lista -> interfaz: http://localhost:8000   (docs de cada servicio en /docs)")
    try:
        if sys.stdin.isatty():
            consola()
        else:
            while True:
                time.sleep(3600)
    finally:
        detener_todos()


if __name__ == "__main__":
    main()
