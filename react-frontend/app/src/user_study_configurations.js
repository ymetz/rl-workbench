const user_study_config = {
    "task_1": {
        "id": "task_1",
        "project": "Task 1",
        "experiment": 1,
        "n_episodes": 3,
        "reset_state": true,
        "request_use_latent_features": true,
        "deterministic_evaluation": false,
        "embedding_method": "UMAP",
        "request_explainer": true,
        "embedding_axis_option": "1d_embedding_time",
        "embedding_settings": {
            "densmap": false, 
            "n_neighbors": 30, 
            "min_dist": 0.15
        }
    },
    "task_2": {
        "id": "task_2",
        "project": "Task 2",
        "experiment": 2,
        "n_episodes": 1,
        "sample_all_checkpoints": true,
        "reset_state": false,
        "request_use_latent_features": true,
        "deterministic_evaluation": true,
        "request_reproject": true,
        "embedding_method": "UMAP",
        "request_explainer": true,
        "embedding_axis_option": "1d_embedding_time",
        "embedding_settings": {
            "densmap": true, 
            "n_neighbors": 30, 
            "min_dist": 0.15
        }
    },
    "task_3": {
        "id": "task_3",
        "project": "Task 3",
        "experiment": 4,
        "n_episodes": 1,
        "sample_all_checkpoints": false,
        "reset_state": false,
        "request_explainer": true,
        "request_reproject": true,
        "request_use_latent_features": true,
        "deterministic_evaluation": true,
        "embedding_method": "UMAP",
        "embedding_axis_option": "1d_embedding_time",
        "embedding_settings": {
            "densmap": true, 
            "n_neighbors": 30, 
            "min_dist": 0.15
        }
    }
}

export {
    user_study_config
};