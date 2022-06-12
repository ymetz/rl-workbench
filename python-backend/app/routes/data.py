import os

from fastapi import APIRouter
from pydantic import BaseModel
from databases import Database
from data_models.agent import RandomAgent
from data_models.global_models import Experiment, Environment, RecordedEpisodes
from data_collection.environment_handler import get_environment
import data_handling.database_handler as db_handler
from data_collection.episode_recorder import EpisodeRecorder
from data_collection import framework_selector

database = Database("sqlite:///test.db")

router = APIRouter()


@router.get("/data/run_benchmark", response_model=dict, tags=["DATA"])
async def run_benchmark(env_id: int = 0,
                        benchmark_type: str = "random",
                        exp_id: int = -1,
                        checkpoint_step: int = -1,
                        n_episodes: int = 1,
                        overwrite: bool = True,
                        render: bool = False,
                        deterministic: bool = True,
                        reset_state: bool = False):
    """
    Run an agent in the provided environment with the given parameters. The experiment id only has to provided
    if benchmark_type trained is used.
    :param env_id: Environment to run the benchmark for (can diverge from the environment id in the experiment)
    :param benchmark_type: (random|trained) Whether to run a random agent or a trained agent
    :param exp_id: (optional) The id of the experiment to run the agent in
        :param checkpoint_step: (optional) The step of the checkpoint to load the agent from
    :param n_episodes: (optional) The number of episodes to run
    :param overwrite: (optional) Whether to overwrite the existing results
    :param render: (optional) Whether to save the rendering of the environment
    :param deterministic: (optional) Whether to use deterministic actions
    :param reset_state: (optional) Whether to reset the state of the environment
    :return:
    """
    db_env = await db_handler.get_single_entry(database, Environment, id=env_id)
    benchmark_env = get_environment(db_env.registration_id)

    if benchmark_type == "trained":
        exp = await db_handler.get_single_entry(database, Experiment, id=exp_id)
        agent = framework_selector.get_agent()(observation_space=benchmark_env.observation_space,
                                               action_space=benchmark_env.action_space,
                                               path=exp.path,
                                               device="auto")
    else:
        agent = RandomAgent(benchmark_env.observation_space, benchmark_env.action_space)

    save_file_name = f"{db_env.registration_id}_{benchmark_type}_{exp_id}_{checkpoint_step}"
    EpisodeRecorder.record_episodes(agent,
                                    benchmark_env,
                                    n_episodes,
                                    max_steps=int(1e5),
                                    save_path=os.path.join("data", "saved_benchmarks", save_file_name),
                                    overwrite=overwrite,
                                    render=render,
                                    deterministic=deterministic,
                                    reset_to_initial_state=reset_state)

    # Return status 200
    return {"status": "ok"}


@router.get("/data/get_benchmark_data", response_model=BaseModel, tags=["DATA"])
async def get_benchmark_data(env_id: int = 0,
                             benchmark_type: str = "random",
                             exp_id: int = -1,
                             checkpoint_step: int = -1):
    """
    Get the data of a benchmark run.
    :param env_id: Environment to run the benchmark for (can diverge from the environment id in the experiment)
    :param benchmark_type: (random|trained) Whether to run a random agent or a trained agent
    :param exp_id: (optional) The id of the experiment to run the agent in
    :param checkpoint_step: (optional) The step of the checkpoint to load the agent from
    :return:
    """
    db_env = await db_handler.get_single_entry(database, Environment, id=env_id)
    load_file_name = f"{db_env.registration_id}_{benchmark_type}_{exp_id}_{checkpoint_step}"

    load_episodes = EpisodeRecorder.load_episodes(os.path.join("data", "saved_benchmarks", load_file_name))

    if load_episodes.obs.size == 0:
        return RecordedEpisodes()

    return RecordedEpisodes(
        obs=load_episodes.obs.tolist(),
        actions=load_episodes.actions.tolist(),
        rews=load_episodes.rews.tolist(),
        dones=load_episodes.dones.tolist(),
        infos=load_episodes.infos.tolist(),
        renders=load_episodes.renders.tolist(),
        features=load_episodes.features.tolist(),
        probs= load_episodes.probs.tolist(),
        episode_rewards=load_episodes.episode_rewards.tolist(),
        episode_lengths=load_episodes.episode_lengths.tolist()
    )

