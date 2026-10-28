import os

URL_PRODUCTOS = os.getenv("URL_PRODUCTOS", "http://localhost:8001")
URL_CLIENTES = os.getenv("URL_CLIENTES", "http://localhost:8002")
TIMEOUT = 3.0       # segundos de espera por llamada
REINTENTOS = 2      # reintentos antes de declarar el servicio caído
