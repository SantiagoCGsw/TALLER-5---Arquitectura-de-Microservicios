from fastapi import APIRouter, HTTPException

from clientes.repository import repo
from clientes.schemas import Cliente, ClienteIn

router = APIRouter(prefix="/clientes", tags=["Clientes"])


@router.get("", response_model=list[Cliente])
def listar():
    return repo.listar()


@router.get("/{cliente_id}", response_model=Cliente)
def obtener(cliente_id: int):
    cliente = repo.obtener(cliente_id)
    if cliente is None:
        raise HTTPException(404, "Cliente no encontrado")
    return cliente


@router.post("", response_model=Cliente, status_code=201)
def crear(datos: ClienteIn):
    return repo.crear(datos)
