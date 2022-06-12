import numpy as np


async def generate_example_data(num_datapoints: int, min_value: float, max_value: float):
    extend = max_value - min_value

    data_x = np.random.rand(num_datapoints)
    data_y = np.random.rand(num_datapoints)
    data_value = (np.random.rand(num_datapoints) * extend) + min_value

    data = [{"x": x, "y": y, "value": value} for x, y, value in zip(data_x, data_y, data_value)]

    return data
