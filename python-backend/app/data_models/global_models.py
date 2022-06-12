from pydantic import BaseModel

"""
    Main Data Models
    All data models should be defined here
    Functions/Data Tables are defined for these data models

"""


class Project(BaseModel):
    id: int
    project_name: str = ""
    created_timestamp: int = -1
    project_path: str = ""
    project_description: str = ""
    project_tags: list = []
    project_environments: list = []
    project_datasets: list = []
    project_experiments: list = []
    wandb_entity: str = ""


class Experiment(BaseModel):
    id: int
    exp_name: str = ""
    created_timestamp: int = -1
    run_timestamp: int = -1
    last_modified: int
    pid: int = -1
    status: str = ""
    environment_id: int = -1
    environment_config: dict = {}
    framework: str = ""
    path: str = ""
    algorithm: str = ""
    hyperparams: dict = {}
    num_timesteps: int = -1
    checkpoint_frequency: int = -1
    checkpoint_list: list = []
    episodes_per_eval: int = -1
    parallel_envs: int = -1
    observation_space_info: dict = {}
    action_space_info: dict = {}
    exp_tags: list = []
    exp_comment: str = ""
    wandb_tracking: bool = False
    device: str = "auto"
    trained_agent_path: str = ""
    seed: int = -1


class Environment(BaseModel):
    id: int
    env_name: str = ""
    registered: int = 0
    registration_id: str = ""
    type: str = ""
    observation_space_info: str = ""
    action_space_info: str = ""
    has_state_loading: int = 0
    description: str = ""
    tags: str = "[]"
    env_path: str = ""
    additional_gym_packages: list[str] = []


class Dataset(BaseModel):
    id: int
    dataset_name: str = ""
    created_timestamp: int = -1
    dataset_path: str = ""
    dataset_description: str = ""
    dataset_tags: list = []
    dataset_environment: str = ""


class TrackingItem(BaseModel):
    id: int
    tracking_id: str = -1
    exp_id: int = -1
    exp_name: str = ""
    env_id: int = -1
    env_name: str = ""
    step_value: int = -1
    obs: str = ""
    is_image: int = 0
    has_state: int = 0
    state: str = ""
    dataset_sample_index: int = -1
    interpret_obs_as_state: int = 0


class EvaluationConfig(BaseModel):
    id: int
    eval_name: str = ""
    exp_id: int = -1
    eval_config: dict = {}
    eval_tags: list = []
    eval_comment: str = ""
    eval_timestamp: int = -1


class RecordedEpisodes(BaseModel):
    obs: list = []
    rewards: list = []
    dones: list = []
    actions: list = []
    renders: list = []
    features: list = []
    probs: list = []
    episode_rewards: list = []
    episode_lengths: list = []


def get_model_by_name(name) -> type[BaseModel]:
    if name == "project":
        return Project
    elif name == "experiment":
        return Experiment
    elif name == "environment":
        return Environment
    elif name == "dataset":
        return Dataset
    elif name == "trackingItem":
        return TrackingItem
    elif name == "evaluationConfig":
        return EvaluationConfig
    elif name == "recordedEpisodes":
        return RecordedEpisodes
    else:
        return None

