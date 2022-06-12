import os
from typing import List

import numpy as np

import data_handling.database_handler as db_handler
from fastapi import APIRouter
from databases import Database
from pydantic import BaseModel

from data_collection import framework_selector
from data_collection.environment_handler import get_environment
from data_collection.episode_recorder import EpisodeRecorder
from data_models.global_models import Environment, Experiment
from visual_components.embedding_handler import EmbeddingHandler

database = Database("sqlite:///test.db")

router = APIRouter()


@router.get("/embedding/get_embedding_methods", response_model=List[str])
def get_embedding_methods():
    """
    Return a list of all available embedding methods
    :return:
    """
    return EmbeddingHandler.get_available_embedding_methods()


@router.get("/embedding/get_embedding_method_params", response_model=str)
def get_embedding_method_params(embedding_method: str = "UMAP"):
    """
    Return the parameters for the given embedding method
    @return:
    """
    return EmbeddingHandler.get_embedding_method_params(embedding_method)


"""
    session_id = request.args.get("session_id", default=0, type=int)
    sequence_length = request.args.get("sequence_length", default=1, type=int)
    step_range = request.args.get("step_range", default="[]", type=str)
    use_latent_features = request.args.get("use_latent_features", default=0, type=int)
    embedding_method = request.args.get("embedding_method", default="UMAP", type=str)
    reproject = True if request.args.get("reproject", default=0, type=int) == 1 else False
    reproject_env_id = request.args.get("reproject_env_id", default=0, type=int)
    reproject_exp_id = request.args.get("reproject_exp_id", default=0, type=int)
    use_one_d_embedding = True if request.args.get("use_one_d_embedding", default=0, type=int) == 1 else False
    reproject_checkpoint_step = request.args.get("reproject_checkpoint_step", default=0, type=int)
    append_time = True if request.args.get("append_time", default=0, type=int) == 1 else False
    embedding_props = request.json if request.json is not None else {}
"""


@router.post("/embedding/current_obs_to_embedding", response_model=dict)
async def get_embedding(
        env_id: int = 0,
        benchmark_type: str = "random",
        exp_id: int = -1,
        checkpoint_step: int = -1,
        sequence_length: int = 1,
        step_range: str = "[]",
        use_latent_features: int = 0,
        embedding_method: str = "UMAP",
        reproject: bool = False,
        reproject_env_id: int = 0,
        reproject_exp_id: int = 0,
        use_one_d_embedding: bool = False,
        reproject_checkpoint_step: int = 0,
        append_time: bool = False,
        embedding_props: dict = {}):
    """
    Get the embedding for the current observation buffer.
    :param env_id:
    :param benchmark_type:
    :param exp_id:
    :param checkpoint_step:
    :param sequence_length:
    :param step_range:
    :param use_latent_features:
    :param embedding_method:
    :param reproject:
    :param reproject_env_id:
    :param reproject_exp_id:
    :param use_one_d_embedding:
    :param reproject_checkpoint_step:
    :param append_time:
    :param embedding_props:
    :return:
    """
    db_env = await db_handler.get_single_entry(database, Environment, id=env_id)
    benchmark_env = get_environment(db_env.registration_id)

    load_file_name = f"{db_env.registration_id}_{benchmark_type}_{exp_id}_{checkpoint_step}"
    loaded_episodes = EpisodeRecorder.load_episodes(os.path.join("data", "saved_benchmarks", load_file_name))

    embedding_handler = EmbeddingHandler()

    # if angle loss is enabled, we need to compute the angle loss
    if embedding_method == "ParametricAngleUMAP":
        action_space_info = benchmark_env.action_space
        if action_space_info.get("type", "Box") == "Discrete":
            nr_of_actions = action_space_info.get("n", 0)
            angle_array = np.arange(0, 2 * np.pi, 2 * np.pi / nr_of_actions)
            actions = loaded_episodes.actions
            # Action is an index, create array of actions, ignore last action as we can only compute
            # the angle loss for the first n-1 actions
            actions_angles = np.array([angle_array[action] for action in actions[:-1]])
            embedding_handler.set_action_angles(actions_angles)

    if step_range == "[]":
        step_range = None
    else:
        step_range = [int(sr) for sr in step_range.strip("[]").split(",")]
    if (embedding_method != ""
            and embedding_handler.get_embedding_method() != embedding_method):
        embedding_handler.set_embedding_method(embedding_method)
    embedding_handler.set_embedding_props(**embedding_props)
    if use_one_d_embedding:
        embedding_handler.embedding_method.n_components = 1
    else:
        embedding_handler.embedding_method.n_components = 2
    if not use_latent_features and len(loaded_episodes[0].obs.shape) > 3:
        embedding_input = loaded_episodes.obs.mean(axis=1) \
                          - loaded_episodes.obs.mean(axis=0)
    else:
        # Reproject to common embedding if requested
        if reproject:
            reproject_embedding(reproject_exp_id, checkpoint_step, benchmark_env, loaded_episodes.obs)
        embedding_input = loaded_episodes.features

    if append_time:
        # episode_indices = np.array([i["episode step"] for i in get_session_bdc(session_id, content_type="infos").get_data()])
        episode_lengths = loaded_episodes.episode_lengths
        infos = loaded_episodes.infos
        episode_indices = np.array([i["episode step"] for i in infos])
        max_episode_index = np.max(episode_indices)
        episode_indices = episode_indices * np.max(embedding_input[0]) / max_episode_index
    else:
        episode_indices = None

    embedding_handler.fit(
        embedding_input,
        sequence_length,
        step_range,
        episode_indices=episode_indices
    )
    embedding_array, n_iter = embedding_handler.get_state()
    return {"embedding": embedding_array.tolist(), "iterations": n_iter}


async def reproject_embedding(exp_id, checkpoint_step, env, obs):
    """
    Reproject current obs buffer with a selected model/feature extractor.
    Do not rely on subprocess because we do not need rendering
    @return:
    """
    print("Reprojecting embedding")
    obs_buffer = obs.get_data().copy()
    # Reverse Shifting of Channels if it happened
    if (
            isinstance(obs_buffer, np.ndarray)
            and len(obs_buffer.shape) == 4
            and obs_buffer.shape[3] > obs_buffer.shape[1]
            and obs_buffer.shape[3] > obs_buffer.shape[2]
    ):
        obs_buffer = np.moveaxis(obs_buffer, [0, 1, 2, 3], [0, 2, 3, 1])

    exp = await db_handler.get_single_entry(database, Experiment, id=exp_id)
    agent = framework_selector.get_agent()(observation_space=env.observation_space,
                                           action_space=env.action_space,
                                           path=exp.path,
                                           device="auto")

    return agent.extract_features(obs)
