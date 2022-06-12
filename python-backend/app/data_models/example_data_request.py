from __future__ import annotations

from pydantic import BaseModel, Field

class ExampleDataRequest(BaseModel):
    num_datapoints: int = Field(alias="numDatapoints")
    min_value: float = Field(default=0.0, alias="minValue")
    max_value: float = Field(default=1.0, alias="maxValue")

    class Config:
        schema_extra = {
            "example": {
                "numDatapoints": 5,
                "minValue": -10,
                "maxValue": 50
            }
        }
