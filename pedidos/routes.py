from fastapi import APIRouter, HTTPException

from pedidos.clients import (ServicioNoDisponible, StockInsuficiente,
                             clientes_api, productos_api)
from pedidos.repository import repo
from pedidos.schemas import Pedido, PedidoIn

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


@router.get("", response_model=list[Pedido])
def listar():
    return repo.listar()


@router.get("/{pedido_id}", response_model=Pedido)
def obtener(pedido_id: int):
    pedido = repo.obtener(pedido_id)
    if pedido is None:
        raise HTTPException(404, "Pedido no encontrado")
    return pedido


@router.post("", response_model=Pedido, status_code=201)
def crear(datos: PedidoIn):
    try:
        cliente = clientes_api.obtener(datos.cliente_id)
        if cliente is None:
            raise HTTPException(404, "El cliente no existe")

        producto = productos_api.obtener(datos.producto_id)
        if producto is None:
            raise HTTPException(404, "El producto no existe")

        productos_api.descontar(datos.producto_id, datos.cantidad)
    except StockInsuficiente:
        raise HTTPException(409, "Stock insuficiente")
    except ServicioNoDisponible as error:
        raise HTTPException(503, str(error))

    return repo.crear(cliente["nombre"], producto["nombre"], datos.cantidad,
                      producto["precio"] * datos.cantidad)
