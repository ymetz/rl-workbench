import inspect
import json
from typing import List, Dict
import numpy as np

import umap

from data_models.agent import TrainedAgent
from utils.parametric_angle_umap import ParametricAngleUMAP
from sklearn.decomposition import PCA


class EmbeddingHandler:
    """
        Embeddding Visualization Helper
    """

    def __init__(self):
        # Default settings
        self.embedding_method = umap.UMAP(n_epochs=300, densmap=True, n_neighbors=50, min_dist=0.4)
        self.action_angles = np.zeros(1)

    def set_embedding_props(self, **kwargs):
        self.embedding_method.set_params(**{k: v for k, v in kwargs.items() if v is not None})

    def set_embedding_method(self, embedding_method):
        if embedding_method == "UMAP":
            self.embedding_method = umap.UMAP()
        elif embedding_method == "ParametricUMAP":
            self.embedding_method = umap.ParametricUMAP()
        elif embedding_method == "ParametricAngleUMAP":
            self.embedding_method = ParametricAngleUMAP()

    def get_embedding_method(self):
        """
        Return the Class Name of the Embedding Method
        :return:
        """
        return self.embedding_method.__class__.__name__

    def fit(self, data: np.array, sequence_length: int, step_range=None, episode_indices=None):
        """
        Fit the embedding method to the data.
        :param data:
        :param sequence_length:
        :param step_range:
        :param episode_indices:
        :return:
        """
        if step_range:
            data = data[step_range[0]: step_range[1]]
        if len(data.shape) <= 2:
            # stack multiple sequence steps before t-SNE
            data = np.vstack(
                np.split(
                    data,
                    np.array(
                        [
                            [i, i + sequence_length]
                            for i in range(data.shape[0] - data.shape[1])
                        ]
                    ).reshape(-1),
                )
            ).reshape(-1, data.shape[1] * sequence_length)
        # If we have high dimensional data, first apply PCA before the UMAP embedding
        if np.prod(data.shape[1:]) > 100:
            pca = PCA(n_components=50)
            data = pca.fit_transform(
                data.reshape(data.shape[0], np.prod(data.shape[1:]))
            )
        self.in_fitting = True
        if episode_indices is not None:
            data = np.concatenate((data, np.expand_dims(episode_indices, -1)), axis=1)
        if self.embedding_method.__class__.__name__ == "ParametricAngleUMAP":
            self.embedding_method.fit_transform(data,
                                                action_angles=self.action_angles)
        else:
            self.embedding_method.fit_transform(data)

    def get_state(self):
        """
        Return the current state of the embedding method.
        :return:
        """
        return self.embedding_method.embedding_, self.embedding_method.n_epochs

    def is_fitting(self):
        """
        Return whether the embedding method is currently fitting.
        :return:
        """
        return self.in_fitting

    @staticmethod
    def get_available_embedding_methods() -> List[str]:
        """
        Return a list of all available embedding methods.
        :return:
        """
        return ["UMAP", "ParametricUMAP", "ParametricAngleUMAP"]

    @staticmethod
    def get_embedding_method_params(embedding_method: str) -> Dict:
        """
        Return the parameters of the embedding method.
        :param embedding_method:
        :return:
        """
        param_dict = {}
        if embedding_method == "UMAP":
            module = umap.UMAP
        elif embedding_method == "ParametricUMAP":
            module = umap.ParametricUMAP
        elif embedding_method == "ParametricAngleUMAP":
            module = ParametricAngleUMAP
        else:
            raise ValueError(f"Unknown embedding method: {embedding_method}")
        for param in inspect.signature(module.__init__).parameters.values():
            if not param.default == inspect.Signature.empty and EmbeddingHelper.is_jsonable(param.default):
                param_dict[param.name] = param.default
        return param_dict

    @staticmethod
    def is_jsonable(x):
        """
        Check if a value is JSONable.
        :param x:
        :return:
        """
        try:
            json.dumps(x)
            return True
        except (TypeError, OverflowError):
            return False

    def set_action_angles(self, action_angles: np.array):
        """
        Set Action Angles to specific values. For each action in a discrete action space, give an angle in radians.
        @param action_angles:
        @return:
        """
        self.action_angles = action_angles
