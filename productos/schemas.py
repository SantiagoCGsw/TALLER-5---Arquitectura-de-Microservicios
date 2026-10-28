from pydantic import BaseModel, Field


class ProductoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    precio: float = Field(gt=0)
    stock: int = Field(ge=0)


class Producto(ProductoIn):
    id: int
