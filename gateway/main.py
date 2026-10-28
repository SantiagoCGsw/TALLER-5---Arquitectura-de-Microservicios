"""Puerta de entrada: sirve la interfaz gráfica y reenvía /api/* a cada microservicio."""
import asyncio
import time
from pathlib import Path

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

SERVICIOS = {
    "productos": "http://localhost:8001",
    "clientes": "http://localhost:8002",
    "pedidos": "http://localhost:8003",
}

app = FastAPI(title="Gateway - Tienda Virtual")


@app.get("/health")
def health():
    return {"servicio": "gateway", "estado": "ok"}


@app.get("/api/estado")
async def estado():
    """Indica qué microservicios responden (alimenta los indicadores de la interfaz)."""
    async with httpx.AsyncClient(timeout=1.5) as http:
        async def consultar(nombre: str, url: str):
            inicio = time.perf_counter()
            try:
                ok = (await http.get(f"{url}/health")).is_success
            except httpx.RequestError:
                ok = False
            ms = round((time.perf_counter() - inicio) * 1000) if ok else None
            return nombre, {"ok": ok, "ms": ms}

        resultados = await asyncio.gather(*(consultar(n, u) for n, u in SERVICIOS.items()))
    return dict(resultados)


@app.api_route("/api/{ruta:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def reenviar(ruta: str, request: Request):
    servicio = ruta.split("/")[0]
    if servicio not in SERVICIOS:
        return JSONResponse({"detail": "Recurso desconocido"}, status_code=404)
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.request(
                request.method, f"{SERVICIOS[servicio]}/{ruta}",
                params=request.query_params, content=await request.body(),
                headers={"content-type": request.headers.get("content-type", "application/json")},
            )
    except httpx.RequestError:
        return JSONResponse({"detail": f"Servicio de {servicio} no disponible"}, status_code=503)
    return Response(r.content, status_code=r.status_code,
                    media_type=r.headers.get("content-type"))


app.mount("/", StaticFiles(directory=Path(__file__).parent / "static", html=True), name="web")
