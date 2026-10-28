from productos.schemas import Producto, ProductoIn

SEMILLA = [
    {"nombre": "Portátil", "precio": 2500000, "stock": 10},
    {"nombre": "Mouse inalámbrico", "precio": 60000, "stock": 50},
    {"nombre": "Teclado mecánico", "precio": 220000, "stock": 25},
    {"nombre": "Monitor 24 pulgadas", "precio": 780000, "stock": 8},
]


class StockInsuficiente(Exception):
    pass


class ProductoRepository:
    """Almacenamiento en memoria (en un sistema real sería una base de datos)."""

    def __init__(self):
        self._items: dict[int, Producto] = {}
        self._siguiente_id = 1
        for datos in SEMILLA:
            self.crear(ProductoIn(**datos))

    def listar(self) -> list[Producto]:
        return list(self._items.values())

    def obtener(self, producto_id: int) -> Producto | None:
        return self._items.get(producto_id)

    def crear(self, datos: ProductoIn) -> Producto:
        producto = Producto(id=self._siguiente_id, **datos.model_dump())
        self._items[producto.id] = producto
        self._siguiente_id += 1
        return producto

    def descontar(self, producto_id: int, cantidad: int) -> Producto | None:
        producto = self.obtener(producto_id)
        if producto is None:
            return None
        if cantidad > producto.stock:
            raise StockInsuficiente()
        producto.stock -= cantidad
        return producto


repo = ProductoRepository()
