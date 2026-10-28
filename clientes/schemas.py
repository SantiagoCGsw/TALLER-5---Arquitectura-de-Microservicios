from pydantic import BaseModel, Field


class ClienteIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class Cliente(ClienteIn):
    id: int
