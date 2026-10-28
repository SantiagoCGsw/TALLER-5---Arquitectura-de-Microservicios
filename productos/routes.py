from fastapi import APIRouter, HTTPException, Query

from productos.repository import StockInsuficiente, repo
from productos.schemas import Producto, ProductoIn

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("", response_model=list[Producto])
def listar():
    return repo.listar()


@router.get("/{producto_id}", response_model=Producto)
def obtener(producto_id: int):
    producto = repo.obtener(producto_id)
    if producto is None:
        raise HTTPException(404, "Producto no encontrado")
    return producto


@router.post("", response_model=Producto, status_code=201)
def crear(datos: ProductoIn):
    return repo.crear(datos)


@router.put("/{producto_id}/descontar", response_model=Producto)
def descontar(producto_id: int, cantidad: int = Query(ge=1)):
    """Operación interna: la usa el servicio de Pedidos al confirmar una compra."""
    try:
        producto = repo.descontar(producto_id, cantidad)
    except StockInsuficiente:
        raise HTTPException(409, "Stock insuficiente")
    if producto is None:
        raise HTTPException(404, "Producto no encontrado")
    return producto
