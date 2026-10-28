from fastapi import FastAPI

from clientes.routes import router

app = FastAPI(title="Microservicio de Clientes")
app.include_router(router)


@app.get("/health", tags=["Sistema"])
def health():
    return {"servicio": "clientes", "estado": "ok"}
