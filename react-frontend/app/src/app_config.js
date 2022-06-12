const config = {
    app_name: 'RL Workbench',
    version_number: '0.6.0',

    observation_space_color: '#2ba8f4',
    action_space_color: '#ce1d1d',
    reward_color: '#f5941f',

    custom_rendering_support: {
        'ImitationSwarmEnv_Stacked': 'bc_swarm_env_nopos',
        'ImitationSwarmEnv_Base': 'bc_swarm_env_nopos',
        'ImitationSwarmEnv_Base_WithPos': 'bc_swarm_env_nopos',
        'Transformer_Training_Env': 'bc_swarm_env_nopos',
        'Imitation_Baseline_Training_Env': 'bc_swarm_env_sincos',
        'ImitationSwarmEnv_WithoutSpeed': 'bc_swarm_env_sincos'

    }
};

export {
    config
};