from __future__ import annotations

from typing import List, TypedDict

from pydantic import BaseModel


class DataPoint(TypedDict):
    x: float
    y: float
    value: float


class ExampleDataResponse(BaseModel):
    __root__: List[DataPoint]

    class Config:
        schema_extra = {
            "example": [
                {
                    "x": 0.7259144318009806,
                    "y": 0.6956366918575212,
                    "value": 5.552118151449463
                },
                {
                    "x": 0.06477029320317351,
                    "y": 0.6431397771638389,
                    "value": 10.917082509309392
                },
                {
                    "x": 0.6616657850166069,
                    "y": 0.7704235200854092,
                    "value": 23.473142157160275
                },
                {
                    "x": 0.8734582814268944,
                    "y": 0.45563940738781517,
                    "value": 21.66329575113829
                },
                {
                    "x": 0.5659110175854882,
                    "y": 0.9090551671240439,
                    "value": -3.7532124602803503
                }
            ]

        }
