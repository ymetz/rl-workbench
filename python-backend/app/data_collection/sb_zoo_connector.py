import difflib
import importlib
import os
import time
import uuid

import gym
import numpy as np
import seaborn
import stable_baselines3.common.policies
import torch as th
from typing import Optional, Tuple, Dict

from stable_baselines3.common.base_class import BaseAlgorithm
from stable_baselines3.common.utils import set_random_seed

# Register custom envs
import rl_baselines3_zoo.utils.import_envs  # noqa: F401 pytype: disable=import-error
from torch import Tensor

from data_models.agent import BaseAgent, TrainedAgent
from rl_baselines3_zoo.utils.exp_manager import ExperimentManager
from rl_baselines3_zoo.utils.utils import ALGOS, StoreDict

import data_models.connector as connector
from data_models.global_models import Experiment, EvaluationConfig, Environment, Project
from data_handling.database_handler import get_single_entry

"""
class ExperimentManager(object):
    Experiment manager: read the hyperparameters,
    preprocess them, create the environment and the RL model.

    Please take a look at `train.py` to have the details for each argument.

    def __init__(
        self,
        args: argparse.Namespace,
        algo: str,
        env_id: str,
        log_folder: str,
        tensorboard_log: str = "",
        n_timesteps: int = 0,
        eval_freq: int = 10000,
        n_eval_episodes: int = 5,
        save_freq: int = -1,
        hyperparams: Optional[Dict[str, Any]] = None,
        env_kwargs: Optional[Dict[str, Any]] = None,
        trained_agent: str = "",
        optimize_hyperparameters: bool = False,
        storage: Optional[str] = None,
        study_name: Optional[str] = None,
        n_trials: int = 1,
        n_jobs: int = 1,
        sampler: str = "tpe",
        pruner: str = "median",
        optimization_log_path: Optional[str] = None,
        n_startup_trials: int = 0,
        n_evaluations: int = 1,
        truncate_last_trajectory: bool = False,
        uuid_str: str = "",
        seed: int = 0,
        log_interval: int = 0,
        save_replay_buffer: bool = False,
        verbose: int = 1,
        vec_env_type: str = "dummy",
        n_eval_envs: int = 1,
        no_optim_plots: bool = False,
        device: Union[th.device, str] = "auto",
    ):
"""


class StableBaselines3Agent(TrainedAgent):

    def __init__(self, observation_space: gym.spaces.Space, action_space: gym.spaces.Space, path, device="auto", **kwargs):
        super().__init__(observation_space, action_space, path, device=device)
        self.model = BaseAlgorithm.load(path, device=device)
        self.agent_state = None
        if "deterministic" in kwargs:
            self.deterministic = kwargs["deterministic"]
        else:
            self.deterministic = False

    def act(self, observation) -> np.ndarray:
        act, state = self.model.predict(observation, state=self.agent_state, deterministic=self.deterministic)
        # Do the state handling internally if necessary
        if state is not None:
            self.agent_state = state
        return act

    def reset(self):
        pass

    def get_value(self, observation) -> np.ndarray:
        if isinstance(self.model, stable_baselines3.common.policies.ActorCriticPolicy):
            return self.model.predict_values(observation).detach().cpu().numpy()
        else:
            return np.zeros(0)

    def get_probability(self, observation, action) -> np.ndarray:
        return np.zeros(0)

    def get_entropy(self, observation) -> np.ndarray:
        return np.zeros(0)

    def additional_outputs(self, observation, action, output_list=None) -> Optional[Dict]:
        """
        If the model has additional outputs, they can be accessed here.
        :param observation:
        :param action:
        :param output_list:
        :return:
        """
        if output_list is None:
            output_list = []

        out_dict = {}
        if "log_prob" in output_list:
            if isinstance(self.model, stable_baselines3.common.policies.ActorCriticPolicy):
                out_dict["log_prob"] = self.model.get_distribution(observation).log_prob(action).detach().cpu().numpy()
            else:
                out_dict["log_prob"] = np.array([0.0])
        if "feature_extractor_output" in output_list:
            out_dict["feature_extractor_output"] = self.model.extract_features(self.model.obs_to_tensor(observation)[0]) \
                .detach().numpy()

        return out_dict

    def extract_features(self, observation):
        if isinstance(self.model, stable_baselines3.common.policies.ActorCriticPolicy):
            return self.model.extract_features(self.model.policy.obs_to_tensor(observation)[0]).detach().numpy()
        else:
            return np.zeros(0)


class StableBaselines3ZooConnector(connector.Connector):

    def __init__(self):
        super().__init__()

    def start_training(self, experiment: Experiment, project: Project):
        self._run_training(experiment, project)

    def continue_training(self, experiment: Experiment, project: Project):
        self._run_training(experiment, project, continue_training=True)

    def start_training_sweep(self, experiments: list[Experiment], project: Project):
        # Combine experiments into one, create hyperparameter sweep
        # and run training
        sweep_experiment = self._combine_experiments(experiments)
        sweep_config = self._create_sweep_config(sweep_experiment)
        self._run_training(sweep_experiment, project, sweep_config=sweep_config)

    def _run_training(self, experiment: Experiment, project: Project, continue_training: bool = False,
                      sweep_config: Optional[dict] = None):
        """

        :param experiment:
        :param project:
        :return:
        """
        try:
            env = get_single_entry(self.database, Environment, experiment.environment_id)
        except Exception as e:
            print(e)
            return

        # Going through custom gym packages to let them register in the global registory
        for env_module in env.additional_gym_packages:
            importlib.import_module(env_module)

        registration_env_id = env.registration_id
        registered_envs = set(gym.envs.registry.env_specs.keys())  # pytype: disable=module-attr

        # If the environment is not found, suggest the closest match
        if registration_env_id not in registered_envs:
            try:
                closest_match = difflib.get_close_matches(registration_env_id, registered_envs, n=1)[0]
            except IndexError:
                closest_match = "'no close match found...'"
            raise ValueError(f"{registration_env_id} not found in gym registry, you maybe meant {closest_match}?")

        # Unique id to ensure there is no race condition for the folder creation
        uuid_str = f"_{uuid.uuid4()}" if experiment.pid else ""
        if experiment.seed < 0:
            # Seed but with a random one
            experiment.seed = np.random.randint(2 ** 32 - 1, dtype="int64").item()

        set_random_seed(experiment.seed)

        # Setting num threads to 1 makes things run faster on cpu
        if args.num_threads > 0:
            if args.verbose > 1:
                print(f"Setting torch.num_threads to {args.num_threads}")
            th.set_num_threads(args.num_threads)

        if continue_training and experiment.trained_agent_path != "":
            assert experiment.trained_agent_path.endswith(".zip") and os.path.isfile(
                experiment.trained_agent_path
            ), "The trained_agent must be a valid path to a .zip file"

        print("=" * 10, registration_env_id, "=" * 10)
        print(f"Seed: {experiment.seed}")

        # Set random seed
        set_random_seed(experiment.seed)
        # Create the experiment directory
        experiment_dir = os.path.join(self.experiment_dir, experiment.exp_name + str(experiment.id))

        if experiment.wandb_tracking:
            try:
                import wandb
            except ImportError:
                raise ImportError(
                    "if you want to use Weights & Biases to track experiment, please install W&B via `pip install wandb`"
                )

            run_name = f"{experiment.environment_id}__{experiment.algorithm}__{experiment.seed}__{int(time.time())}"
            run = wandb.init(
                name=run_name,
                project=project.project_name,
                entity=project.wandb_entity,
                config=experiment.dict(),
                sync_tensorboard=True,  # auto-upload sb3's tensorboard metrics
                monitor_gym=True,  # auto-upload the videos of agents playing the game
                save_code=True,  # optional
            )
            tensorboard_log = f"runs/{run_name}"
        else:
            tensorboard_log = experiment_dir

        # Create the experiment manager
        exp_manager = ExperimentManager(
            None,
            experiment.algorithm,
            registration_env_id,
            experiment_dir,
            tensorboard_log=tensorboard_log,
            n_timesteps=experiment.num_timesteps,
            eval_freq=experiment.callback_frequency,
            n_eval_episodes=experiment.episodes_per_eval // 5,
            save_freq=experiment.callback_frequency,
            hyperparams=experiment.hyperparams,
            env_kwargs=experiment.environment_config,
            trained_agent=experiment.trained_agent_path if continue_training else None,
            optimize_hyperparameters=False,
            seed=experiment.seed,
            save_replay_buffer=False,
            verbose=1,
            device=experiment.device
        )

        # Prepare experiment and launch hyperparameter optimization if needed
        results = exp_manager.setup_experiment()
        if results is not None:
            model, saved_hyperparams = results
            if experiment.wandb_tracking:
                # we need to save the loaded hyperparameters
                experiment.saved_hyperparams = saved_hyperparams
                run.config.setdefaults(experiment.dict())

            # Normal training
            if model is not None:
                exp_manager.learn(model)
                exp_manager.save_trained_model(model)

    def _combine_experiments(self, experiments: list[Experiment]):
        """
        Combines multiple experiment configurations into one.
        Keep shared settings, and create parameter configs
        """
        # Get the shared settings
        shared_settings = experiments[0].dict()
        for key in shared_settings:
            if key not in ["algorithm", "environment_id", "environment_config"]:
                del shared_settings[key]

        # Create the parameter configs
        parameter_configs = []
        for experiment in experiments:
            experiment_settings = experiment.dict()
            for key in shared_settings:
                if key not in experiment_settings:
                    experiment_settings[key] = shared_settings[key]

            parameter_configs.append(experiment_settings)

        return shared_settings, parameter_configs

    def start_evaluation(self, experiment: Experiment, project: Project, evaluation_config: EvaluationConfig):
        """
        Starts evaluation of the experiment.
        :param experiment: Experiment object
        :param project: Project object
        :param evaluation_config: EvaluationConfig object
        :return:
        """
        pass

    def start_evaluation_sweep(self, experiments: list[Experiment], project: Project,
                               evaluation_configs: list[EvaluationConfig]):
        """
        Starts evaluation of multiple experiments.
        :param experiments:
        :param project:
        :param evaluation_configs:
        :return:
        """
        pass

    def get_algorithms(self) -> list[str]:
        """
        Returns all available algorithms.
        :return:
        """
        pass

    def get_algorithm_default_config(self, algorithm_name: str) -> dict:
        """
        Returns the parameter settings values of a selected algorithm.
        :param algorithm_name:
        :return:
        """
        pass

    def get_evaluation_agent(self, env: gym.Env, path: str) -> StableBaselines3Agent:
        """
        Returns the model that can be used to run in an environment.
        :return:
        """
        agent = StableBaselines3Agent(env.observation_space, env.action_space)
        agent.load(path)
        return agent
