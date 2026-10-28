from datetime import datetime

from pedidos.schemas import Pedido


class PedidoRepository:
    """Almacenamiento en memoria (en un sistema real sería una base de datos)."""

    def __init__(self):
        self._items: list[Pedido] = []

    def listar(self) -> list[Pedido]:
        return list(reversed(self._items))   # los más recientes primero

    def obtener(self, pedido_id: int) -> Pedido | None:
        return next((p for p in self._items if p.id == pedido_id), None)

    def crear(self, cliente: str, producto: str, cantidad: int, total: float) -> Pedido:
        pedido = Pedido(
            id=len(self._items) + 1, cliente=cliente, producto=producto,
            cantidad=cantidad, total=total, estado="CREADO",
            fecha=datetime.now().isoformat(timespec="seconds"),
        )
        self._items.append(pedido)
        return pedido


repo = PedidoRepository()
