from fastapi import FastAPI

from pedidos.routes import router

app = FastAPI(title="Microservicio de Pedidos")
app.include_router(router)


@app.get("/health", tags=["Sistema"])
def health():
    return {"servicio": "pedidos", "estado": "ok"}
