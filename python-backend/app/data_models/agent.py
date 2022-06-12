from abc import ABC
from typing import Optional, Dict

import gym
import os
import numpy as np


class BaseAgent(object):

    def __init__(self, observation_space, action_space):
        self.observation_space = observation_space
        self.action_space = action_space

    def act(self, observation):
        raise NotImplementedError

    def reset(self):
        raise NotImplementedError

    def get_value(self, observation) -> np.ndarray:
        raise NotImplementedError

    def get_probability(self, observation, action) -> np.ndarray:
        raise NotImplementedError

    def additional_outputs(self, observation, action, output_list=None) -> Optional[Dict]:
        raise NotImplementedError


class TrainedAgent(BaseAgent, ABC):

    def __init__(self, observation_space, action_space, path, device="auto"):
        super().__init__(observation_space, action_space)
        self.path = path
        self.device = device

    def act(self, observation):
        raise NotImplementedError

    def reset(self):
        raise NotImplementedError

    def get_value(self, observation) -> np.ndarray:
        raise NotImplementedError

    def get_probability(self, observation, action) -> np.ndarray:
        raise NotImplementedError

    def additional_outputs(self, observation, action, output_list=None) -> Optional[Dict]:
        raise NotImplementedError

    def extract_features(self, observation) -> np.ndarray:
        raise NotImplementedError


class RandomAgent(BaseAgent):

    def __init__(self, observation_space, action_space):
        super().__init__(observation_space, action_space)

    def act(self, observation):
        return self.action_space.sample()

    def reset(self):
        pass

    def get_value(self, observation) -> np.ndarray:
        return np.zeros(0)

    def get_probability(self, observation, action) -> np.ndarray:
        return np.array([1 / self.action_space.n])

    def additional_outputs(self, observation, action, output_list=None) -> Optional[Dict]:
        raise {}
