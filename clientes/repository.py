from clientes.schemas import Cliente, ClienteIn

SEMILLA = [
    {"nombre": "Ana Pérez", "email": "ana@correo.com"},
    {"nombre": "Carlos Ruiz", "email": "carlos@correo.com"},
]


class ClienteRepository:
    """Almacenamiento en memoria (en un sistema real sería una base de datos)."""

    def __init__(self):
        self._items: dict[int, Cliente] = {}
        self._siguiente_id = 1
        for datos in SEMILLA:
            self.crear(ClienteIn(**datos))

    def listar(self) -> list[Cliente]:
        return list(self._items.values())

    def obtener(self, cliente_id: int) -> Cliente | None:
        return self._items.get(cliente_id)

    def crear(self, datos: ClienteIn) -> Cliente:
        cliente = Cliente(id=self._siguiente_id, **datos.model_dump())
        self._items[cliente.id] = cliente
        self._siguiente_id += 1
        return cliente


repo = ClienteRepository()
