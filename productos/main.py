from fastapi import FastAPI

from productos.routes import router

app = FastAPI(title="Microservicio de Productos")
app.include_router(router)


@app.get("/health", tags=["Sistema"])
def health():
    return {"servicio": "productos", "estado": "ok"}
