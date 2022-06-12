from typing import Type

from data_models.connector import Connector
from data_models.agent import TrainedAgent
from data_collection.sb_zoo_connector import StableBaselines3ZooConnector, StableBaselines3Agent

SUPPORTED_FRAMEWORK_LIST = ["StableBaselines3"]


def get_connector(framework: str) -> Type[Connector]:
    """
    Get the connector for the given framework.
    :param framework:
    :return:
    """
    assert framework in SUPPORTED_FRAMEWORK_LIST, "Framework not supported"
    if framework == "StableBaselines3":
        return StableBaselines3ZooConnector
    else:
        raise ValueError("Framework not supported.")


def get_agent(framework: str) -> Type[TrainedAgent]:
    """
    Get the agent for the given framework.
    :param framework:
    :return:
    """
    assert framework in SUPPORTED_FRAMEWORK_LIST, "Framework not supported"
    if framework == "StableBaselines3":
        return StableBaselines3Agent
    else:
        raise ValueError("Framework not supported.")


def get_framework_list() -> list:
    """
    Get the list of supported frameworks.
    :return:
    """
    return SUPPORTED_FRAMEWORK_LIST
