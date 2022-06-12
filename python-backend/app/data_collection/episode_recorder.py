import os
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Union

import gym
import numpy as np
from copy import deepcopy

from stable_baselines3.common.vec_env import DummyVecEnv, VecEnv, VecMonitor, is_vecenv_wrapped
from data_models.agent import BaseAgent
from data_models.global_models import RecordedEpisodes


@dataclass
class RecordedEpisodesContainer:
    obs: np.ndarray
    rewards: np.ndarray
    dones: np.ndarray
    actions: np.ndarray
    renders: np.ndarray
    features: np.ndarray
    probs: np.ndarray
    episode_rewards: np.ndarray
    episode_lengths: np.ndarray


class EpisodeRecorder(object):

    def __init__(self):
        pass

    @staticmethod
    def record_episodes(
            agent: BaseAgent,
            env: Union[gym.Env, VecEnv],
            n_eval_episodes: int = 2,
            max_steps: int = -1,
            save_path: str = "",
            overwrite: bool = False,
            deterministic: bool = False,
            render: bool = True,
            reset_to_initial_state: bool = True,
            additional_out_attributes: Optional[Dict[str, Any]] = None,
            callback: Optional[Callable[[Dict[str, Any], Dict[str, Any]], None]] = None
    ):
        """
        Runs policy for ``n_eval_episodes`` episodes and returns average reward.
        If a vector env is passed in, this divides the episodes to evaluate onto the
        different elements of the vector env. This static division of work is done to
        remove bias. See https://github.com/DLR-RM/stable-baselines3/issues/402 for more
        details and discussion.

        .. note::
            If environment has not been wrapped with ``Monitor`` wrapper, reward and
            episode lengths are counted as it appears with ``env.step`` calls. If
            the environment contains wrappers that modify rewards or episode lengths
            (e.g. reward scaling, early episode reset), these will affect the evaluation
            results as well. You can avoid this by wrapping environment with ``Monitor``
            wrapper before anything else.

        :param agent: The agent to select actions
        :param env: The gym environment or ``VecEnv`` environment.
        :param n_eval_episodes: Number of episode to evaluate the agent
        :param deterministic: Whether to use deterministic or stochastic actions
        :param overwrite: Whether to overwrite the existing results
        :param save_path: Path to save the evaluation results
        :param max_steps: If greater than 0, will only run the environment for the given number of steps (default: -1)
        :param render: Whether to render the environment or not
        :param callback: callback function to do additional checks,
            called after each step. Gets locals() and globals() passed as parameters.
        :param reset_to_initial_state: If set, the environment is set to an initial state for each episode
        :param additional_out_attributes: Additional attributes to save in the output file, might depend on the library used
        :return: Mean reward per episode, std of reward per episode.
        """
        is_monitor_wrapped = False
        # Avoid circular import
        from stable_baselines3.common.monitor import Monitor

        if not isinstance(env, VecEnv):
            env = DummyVecEnv([lambda: env])

        is_monitor_wrapped = is_vecenv_wrapped(env, VecMonitor) or env.env_is_wrapped(Monitor)[0]

        n_envs = env.num_envs
        episode_rewards = []
        episode_lengths = []

        episode_counts = np.zeros(n_envs, dtype="int")
        # Divides episodes among different sub environments in the vector as evenly as possible
        episode_count_targets = np.array([(n_eval_episodes + i) // n_envs for i in range(n_envs)], dtype="int")

        current_rewards = np.zeros(n_envs)
        current_lengths = np.zeros(n_envs, dtype="int")

        obs_buffer = []
        feature_extractor_buffer = []
        actions_buffer = []
        dones_buffer = []
        rew_buffer = []
        render_buffer = []
        infos_buffer = []
        probs_buffer = []

        observations = env.reset()
        if reset_to_initial_state:
            initial_states = tuple(deepcopy(e) for e in env.envs)
        else:
            initial_states = None
        reset_obs = observations.copy()
        states = None
        values = None
        probs = None
        total_steps = 0
        while (episode_counts < episode_count_targets).any() and max_steps <= total_steps:
            obs_buffer.append(np.squeeze(observations))
            actions, states = agent.act(observations)
            # If policy is not part of the model, we have directly loaded a policy
            additional_out_attributes = agent.additional_outputs(observations, actions,
                                                                 output_list=["log_prob", "feature_extractor_output"])
            if "feautre_extractor_output" in additional_out_attributes:
                feature_extractor_buffer.append(np.squeeze(additional_out_attributes["feature_extractor_output"]))
            if "log_prob" in additional_out_attributes:
                probs_buffer.append(np.squeeze(np.exp(additional_out_attributes["log_prob"])))
            values = agent.get_value(observations)

            observations, rewards, dones, infos = env.step(actions)
            actions_buffer.append(np.squeeze(actions))
            rew_buffer.append(np.squeeze(rewards))
            dones_buffer.append(np.squeeze(dones))
            infos_buffer.append(infos)
            current_rewards += rewards
            current_lengths += 1
            for i in range(n_envs):
                if episode_counts[i] < episode_count_targets[i]:

                    # unpack values so that the callback can access the local variables
                    reward = rewards[i]
                    done = dones[i]
                    info = infos[i]

                    if values is not None:
                        info['value'] = values[i]

                    if callback is not None:
                        callback(locals(), globals())

                    if dones[i]:
                        if is_monitor_wrapped:
                            # Atari wrapper can send a "done" signal when
                            # the agent loses a life, but it does not correspond
                            # to the true end of episode
                            if "episode" in info.keys():
                                # Do not trust "done" with episode endings.
                                # Monitor wrapper includes "episode" key in info if environment
                                # has been wrapped with it. Use those rewards instead.
                                episode_rewards.append(info["episode"]["r"])
                                episode_lengths.append(info["episode"]["l"])
                                info["label"] = "Real Game End"
                                # Only increment at the real end of an episode
                                episode_counts[i] += 1
                                # Reset the done environment to the initial state
                                if reset_to_initial_state:
                                    env.envs[i] = deepcopy(initial_states[i])
                                    observations[i] = reset_obs[i]

                        else:
                            episode_rewards.append(current_rewards[i])
                            episode_lengths.append(current_lengths[i])
                            episode_counts[i] += 1
                            if reset_to_initial_state:
                                env.envs[i] = deepcopy(initial_states[i])
                                observations[i] = reset_obs[i]
                        # Remove terminal_observation as we don't need it to pass to the next episode
                        if "terminal_observation" in info.keys():
                            info.pop("terminal_observation")
                        current_rewards[i] = 0
                        current_lengths[i] = 0
                        if states is not None:
                            states[i] *= 0

            if render:
                render_frame = env.render(mode="rgb_array")
                render_buffer.append(np.squeeze(render_frame))

        # For now, only allow a single env (in vec_env)
        # Now, turn the nested list into a sequential list (i.e. just just put the nested list after each other)

        # infos_buffer = np.array(infos_buffer)
        if env.num_envs == 1:
            infos_buffer = [info[0] for info in infos_buffer]
            current_step_in_episode = 0
            for i in range(len(infos_buffer)):
                infos_buffer[i]["id"] = i
                if dones_buffer[i]:
                    current_step_in_episode = 0
                infos_buffer[i]["episode step"] = current_step_in_episode
            if "value" in infos_buffer[0].keys():
                infos_buffer[np.argmax([i["value"] for i in infos_buffer])]["label"] = "Max. Value"
                infos_buffer[np.argmin([i["value"] for i in infos_buffer])]["label"] = "Min. Value"
                infos_buffer[np.argmax(rew_buffer)]["label"] = "Max. Step Reward"
                infos_buffer[np.argmin(rew_buffer)]["label"] = "Min. Step Reward"

            ep_length_idx = 0
            step_idx = 0
            for i in range(len(infos_buffer)):
                if step_idx >= episode_lengths[ep_length_idx]:
                    ep_length_idx += 1
                    step_idx = 0
                infos_buffer[i]["game episode step"] = step_idx
                step_idx += 1

        if render:
            render_buffer = np.array(render_buffer)
        else:
            render_buffer = np.zeros(1)

        if len(obs_buffer[0].shape) == 2:
            obs_buffer = np.expand_dims(obs_buffer, axis=-1)
        else:
            obs_buffer = np.array(obs_buffer)
        actions_buffer = np.array(actions_buffer)
        dones_buffer = np.array(dones_buffer)
        rew_buffer = np.array(rew_buffer)
        episode_rewards = np.array(episode_rewards)
        episode_lengths = np.array(episode_lengths)
        feature_extractor_buffer = np.array(feature_extractor_buffer)
        infos_buffer = np.array(infos_buffer)
        probs_buffer = np.array(probs_buffer)

        # If overwrite is not set, we will append to the existing buffer
        if not overwrite and os.path.isfile(save_path):
            previous_bm = np.load(save_path, allow_pickle=True)
            obs_buffer = np.concatenate((previous_bm["obs_buffer"], obs_buffer), axis=0)
            actions_buffer = np.concatenate((previous_bm["actions_buffer"], actions_buffer), axis=0)
            dones_buffer = np.concatenate((previous_bm["dones_buffer"], dones_buffer), axis=0)
            rew_buffer = np.concatenate((previous_bm["rew_buffer"], rew_buffer), axis=0)
            episode_rewards = np.concatenate((previous_bm["episode_rewards"], episode_rewards), axis=0)
            episode_lengths = np.concatenate((previous_bm["episode_lengths"], episode_lengths), axis=0)
            feature_extractor_buffer = np.concatenate((previous_bm["feature_extractor_buffer"],
                                                       feature_extractor_buffer), axis=0)
            infos_buffer = np.concatenate((previous_bm["infos_buffer"], infos_buffer), axis=0)
            probs_buffer = np.concatenate((previous_bm["probs_buffer"], probs_buffer), axis=0)
            render_buffer = np.concatenate((previous_bm["render_buffer"], render_buffer), axis=0)

        with open(
                os.path.join(save_path), "wb"
        ) as f:
            np.savez(
                f,
                obs=obs_buffer,
                rewards=rew_buffer,
                dones=dones_buffer,
                actions=actions_buffer,
                renders=render_buffer,
                feature_extractor_buffer=feature_extractor_buffer,
                probs=probs_buffer,
                episode_rewards=episode_rewards,
                episode_lengths=episode_lengths,
            )

    @staticmethod
    def load_episodes(save_path) -> RecordedEpisodesContainer:
        """
        Load episodes from a file.
        """
        with open(save_path, "rb") as f:
            bm = np.load(f, allow_pickle=True)

        return RecordedEpisodesContainer(
            obs=bm["obs"],
            rewards=bm["rewards"],
            dones=bm["dones"],
            actions=bm["actions"],
            renders=bm["renders"],
            features=bm["feature_extractor_buffer"],
            probs=bm["probs"],
            episode_rewards=bm["episode_rewards"],
            episode_lengths=bm["episode_lengths"],
        )


