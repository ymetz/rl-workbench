import React, { PureComponent } from 'react';
import axios from 'axios';
import { ListGroup } from 'react-bootstrap';
import Evaluation_Test_Case from './Evaluation_Test_Case';

export default class evaluation_test_list extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            tracking_item_obs: [],
            tracking_dataset_obs: [],
            tracking_item_actions: [],
            tracking_item_renders: [],
            tracking_item_probabilities: [],
            tracking_item_attr: [],
            timesteps_per_tracking_case: 990,
            experiment_id: -1,
            checkpoint_step: 0,
            external_data_timestamp: 0,
            internal_data_timestamp: 0,
        };
    }

    componentDidMount() {
        if (this.props.dataTimestamp > this.state.external_data_timestamp) {
            this.setState({ external_data_timestamp: this.props.dataTimestamp }, this.benchmarkTrainedModel());
        }
    }

    componentDidUpdate() {
        if (this.props.dataTimestamp > this.state.external_data_timestamp) {
            this.setState({ external_data_timestamp: this.props.dataTimestamp }, this.benchmarkTrainedModel());
        }
    }

    benchmarkTrainedModel() {
        const exp_id = this.props.experimentId;
        const checkpoint_step = this.props.selectCheckpoint;
        const rendering = this.props.render ? 1 : 0;
        const explainer = this.props.requestExplainer ? 1 : 0;
        if (this.props.trackingItems.length > 0) {
            axios
                .get(
                    '/routing/run_benchmark_for_test_cases?tracking_ids=' +
                        JSON.stringify(this.props.trackingItems.map((item) => item.tracking_id)) +
                        '&run_trained_model=1&exp_id=' +
                        exp_id +
                        '&rendering=' +
                        rendering +
                        '&env_id=' +
                        this.props.envId +
                        '&checkpoint_timestep=' +
                        checkpoint_step +
                        '&run_explainer=' +
                        explainer +
                        '&timesteps_per_case=' +
                        this.state.timesteps_per_tracking_case
                )
                .then((res) => {
                    const buffers = res.data;
                    this.setState({
                        tracking_item_obs: buffers.obs,
                        tracking_item_actions: buffers.actions,
                        tracking_item_attr: buffers.attr,
                        tracking_item_probabilities: buffers.probabilities,
                        tracking_item_renders: buffers.renders,
                        tracking_dataset_renders: buffers.ds_renders,
                        tracking_dataset_obs: buffers.dataset_obs,
                        tracking_dataset_actions: buffers.dataset_actions,
                        internal_data_timestamp: buffers.data_timestamp,
                        benchmark_time: { benchmark_time: buffers.benchmark_time },
                        show_render_image: rendering == 1 ? true : false,
                    });
                });
        }
    }

    getTrackingItems() {
        if (!this.props.spaceInfo.obs_space) return;

        let display_image = false;
        if (this.props.spaceInfo.obs_space)
            display_image = this.props.spaceInfo.obs_space.type === 'Box' && this.props.spaceInfo.obs_space.is_image;

        let channel_number = 0;
        if (display_image)
            channel_number = this.props.spaceInfo.obs_space.shape[this.props.spaceInfo.obs_space.shape.length - 1];
        return this.props.trackingItems.map((item, idx) => (
            <Evaluation_Test_Case
                tcIndex={idx}
                obs={this.state.tracking_item_obs[idx]}
                renders={this.state.tracking_item_renders[idx]}
                datasetRenders={this.state.tracking_dataset_renders[idx]}
                actions={this.state.tracking_item_actions[idx]}
                datasetActions={this.state.tracking_dataset_actions[idx]}
                probabilities={this.state.tracking_item_probabilities[idx]}
                spaceInfo={this.props.spaceInfo}
                trackingID={item.tracking_id}
                expName={item.exp_name}
                envName={item.env_name}
                displayImage={display_image}
                timestepsPerTrackingCase={this.state.timesteps_per_tracking_case}
                hasStateLoading={item.has_state === 1 ? true : false}
                interpretObsAsState={item.interpret_obs_as_state === 1 ? true : false}
                dataTimestamp={this.state.internal_data_timestamp}
            />
        ));
    }

    render() {
        return (
            <div>
                <ListGroup>{this.state.internal_data_timestamp > 0 ? this.getTrackingItems() : []}</ListGroup>
            </div>
        );
    }
}
