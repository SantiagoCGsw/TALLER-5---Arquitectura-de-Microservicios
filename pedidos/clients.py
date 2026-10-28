"""Clientes HTTP hacia los otros microservicios, con timeout y reintentos."""
import time

import httpx

from pedidos import config


class ServicioNoDisponible(Exception):
    pass


class StockInsuficiente(Exception):
    pass


class _ClienteHttp:
    nombre = ""
    base_url = ""

    def _enviar(self, metodo: str, ruta: str, **kwargs) -> httpx.Response:
        for intento in range(config.REINTENTOS + 1):
            try:
                return httpx.request(metodo, f"{self.base_url}{ruta}",
                                     timeout=config.TIMEOUT, **kwargs)
            except httpx.RequestError:
                if intento < config.REINTENTOS:
                    time.sleep(0.2)
        raise ServicioNoDisponible(f"Servicio de {self.nombre} no disponible")

    def _obtener_o_none(self, ruta: str) -> dict | None:
        r = self._enviar("GET", ruta)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()


class ClientesApi(_ClienteHttp):
    nombre = "clientes"
    base_url = config.URL_CLIENTES

    def obtener(self, cliente_id: int) -> dict | None:
        return self._obtener_o_none(f"/clientes/{cliente_id}")


class ProductosApi(_ClienteHttp):
    nombre = "productos"
    base_url = config.URL_PRODUCTOS

    def obtener(self, producto_id: int) -> dict | None:
        return self._obtener_o_none(f"/productos/{producto_id}")

    def descontar(self, producto_id: int, cantidad: int) -> dict:
        r = self._enviar("PUT", f"/productos/{producto_id}/descontar",
                         params={"cantidad": cantidad})
        if r.status_code == 409:
            raise StockInsuficiente()
        r.raise_for_status()
        return r.json()


clientes_api = ClientesApi()
productos_api = ProductosApi()
