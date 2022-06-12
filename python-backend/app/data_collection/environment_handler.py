import gym


def get_environment(env_name: str = "CartPole-v0") -> gym.Env:
    """
    Get the gym environment by name.
    :param env_name:
    :return:
    """
    return gym.make(env_name)