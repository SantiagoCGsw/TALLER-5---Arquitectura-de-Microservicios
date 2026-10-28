from pydantic import BaseModel, Field


class PedidoIn(BaseModel):
    cliente_id: int
    producto_id: int
    cantidad: int = Field(ge=1)


class Pedido(BaseModel):
    id: int
    cliente: str
    producto: str
    cantidad: int
    total: float
    estado: str
    fecha: str
