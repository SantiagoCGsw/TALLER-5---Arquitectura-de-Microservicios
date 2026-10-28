"""Pruebas de extremo a extremo (a través del gateway) con simulación de fallo.

    python -m tests.probar_apis
"""
import sys

import requests

import run_all

API = "http://localhost:8000/api"
resultados: list[bool] = []


def chequear(descripcion: str, respuesta: requests.Response, esperado: int) -> None:
    ok = respuesta.status_code == esperado
    resultados.append(ok)
    print(f"[{'OK   ' if ok else 'FALLA'}] {descripcion:<46} -> {respuesta.status_code} {respuesta.text[:80]}")


def main() -> int:
    run_all.iniciar_todos()
    try:
        print("\n--- Productos ---")
        chequear("GET /productos", requests.get(f"{API}/productos"), 200)
        chequear("POST /productos", requests.post(f"{API}/productos",
                 json={"nombre": "Webcam HD", "precio": 150000, "stock": 12}), 201)
        chequear("POST /productos (precio inválido)", requests.post(f"{API}/productos",
                 json={"nombre": "X", "precio": -5, "stock": 1}), 422)
        chequear("GET /productos/999", requests.get(f"{API}/productos/999"), 404)

        print("\n--- Clientes ---")
        chequear("GET /clientes", requests.get(f"{API}/clientes"), 200)
        chequear("POST /clientes", requests.post(f"{API}/clientes",
                 json={"nombre": "Luis Gómez", "email": "luis@correo.com"}), 201)
        chequear("POST /clientes (correo inválido)", requests.post(f"{API}/clientes",
                 json={"nombre": "Luis", "email": "no-es-correo"}), 422)

        print("\n--- Pedidos ---")
        chequear("POST /pedidos (válido)", requests.post(f"{API}/pedidos",
                 json={"cliente_id": 1, "producto_id": 1, "cantidad": 2}), 201)
        chequear("GET /pedidos/1", requests.get(f"{API}/pedidos/1"), 200)
        stock = requests.get(f"{API}/productos/1").json()["stock"]
        resultados.append(stock == 8)
        print(f"[{'OK   ' if stock == 8 else 'FALLA'}] Stock descontado en Productos (esperado 8)       -> {stock}")
        chequear("POST /pedidos (stock insuficiente)", requests.post(f"{API}/pedidos",
                 json={"cliente_id": 1, "producto_id": 1, "cantidad": 999}), 409)
        chequear("POST /pedidos (cliente inexistente)", requests.post(f"{API}/pedidos",
                 json={"cliente_id": 99, "producto_id": 1, "cantidad": 1}), 404)

        print("\n--- Simulación de fallo: se detiene el servicio de PRODUCTOS ---")
        run_all.detener("productos")
        chequear("POST /pedidos (Productos caído)", requests.post(f"{API}/pedidos",
                 json={"cliente_id": 1, "producto_id": 1, "cantidad": 1}), 503)
        chequear("GET /productos (Productos caído)", requests.get(f"{API}/productos"), 503)
        chequear("GET /clientes (sigue funcionando)", requests.get(f"{API}/clientes"), 200)
        chequear("GET /pedidos (sigue funcionando)", requests.get(f"{API}/pedidos"), 200)
        print("GET /estado ->", requests.get(f"{API}/estado").json())

        print("\n--- Recuperación: se vuelve a levantar PRODUCTOS ---")
        run_all.iniciar("productos")
        run_all.esperar("productos")
        chequear("GET /productos (recuperado)", requests.get(f"{API}/productos"), 200)
    finally:
        run_all.detener_todos()

    print(f"\nResultado: {sum(resultados)}/{len(resultados)} pruebas correctas")
    return 0 if all(resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
