# Tienda Virtual · Microservicios (FastAPI)

```
tienda/
├── productos/   (8001)  schemas · repository · routes · main
├── clientes/    (8002)  schemas · repository · routes · main
├── pedidos/     (8003)  schemas · repository · routes · clients · config · main
├── gateway/     (8000)  main + static/ (interfaz gráfica: index.html, style.css, app.js)
├── tests/probar_apis.py
├── run_all.py
└── requirements.txt
```

## Ejecutar
```
pip install -r requirements.txt
python run_all.py            # abre http://localhost:8000
python -m tests.probar_apis  # pruebas automáticas con simulación de fallo
```
En `run_all.py` puedes escribir `detener productos` / `iniciar productos` para ver cómo la
interfaz marca el servicio como caído y cómo Pedidos responde 503 sin afectar al resto.

## Google Colab
```
!pip install -r requirements.txt
import subprocess; subprocess.Popen(["python", "run_all.py"])
from google.colab import output; output.serve_kernel_port_as_iframe(8000)
```
