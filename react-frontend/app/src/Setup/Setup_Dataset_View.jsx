import React, { PureComponent } from 'react';
import { Alert, Col, Row } from 'react-bootstrap';
import Setup_Dataset_Embedding from './Setup_Dataset_Embedding';
import Setup_Dataset_Widget from './Setup_Dataset_Widget';
import Setup_Sidebar from './Setup_Sidebar';
import '../css/Setup.module.css';
import axios from 'axios';

export default class Setup_Dataset_View extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            dataset_sample: { sampled_obs: [], sampled_actions: [], embedding: [] },
            selected_env: { name: '', id: -1, has_state_loading: false },
            current_env_info: { obs_space: undefined, action_space: undefined },
            current_dataset_info: { obs_space: undefined, action_space: undefined },
            // Generally, no state is available from datasets, but for some envs. the obs may be interpreted as the state
            interpret_obs_as_state: false,
            dataset_sample_size: 50,
            steps_per_sample: 360,
            spaces_do_fit: true,
            tsne_sequence_length: 1,
            data_timestamp: 0,
            selected_datapoint_id: 0,
            request_rendering: true,
            datapoint_indices: [],
            dataset_length: 0,
        };
    }

    /**
     * Dataset Path
     * @param {*} event
     */
    loadDataset() {
        axios
            .get(
                '/routing/load_dataset?dataset_path=' +
                    this.state.dataset_path +
                    '&sample_size=' +
                    this.state.dataset_sample_size +
                    '&steps_per_sample=' +
                    this.state.steps_per_sample +
                    '&env_id=' +
                    this.state.selected_env.id +
                    '&sequence_length=' +
                    1
            )
            .then((res) => {
                const buffers = res.data;
                console.log(buffers.spaces_fit);
                if (buffers.spaces_fit == 1) {
                    console.log('Dataset loaded successfully');
                    this.setState(
                        {
                            current_env_info: buffers.env_space_info,
                            current_dataset_info: buffers.dataset_space_info,
                            dataset_sample: {
                                sampled_obs: buffers.sampled_obs,
                                sampled_actions: buffers.sampled_actions,
                                embedding: buffers.embedding,
                            },
                            data_timestamp: buffers.data_timestamp,
                            dataset_length: buffers.dataset_length,
                            datapoint_indices: buffers.sample_indices,
                            selected_datapoint_id: 0,
                            selected_dataset_index: buffers.sample_indices[0],
                            spaces_do_fit: true,
                        },
                        () => {
                            //this._addCurrentSelectionToTrackingItem({ step: 0 });
                        }
                    );
                } else {
                    this.setState({
                        spaces_do_fit: false,
                        current_dataset_info: buffers.dataset_space_info,
                        current_env_info: buffers.env_space_info,
                    });
                }
            });
    }

    /**
     * Called from the Sidebar component to update relevant state values,
     * especially for the benchmarking, env or algorithm name
     * @param {{paramter_name:paramenter_value}} updated_props
     */
    setSidebarProp(updated_props) {
        this.setState(updated_props);
    }

    _addCurrentSelectionToTrackingItem(save_props) {
        // if we do not have any data, do not add to list
        const current_project = this.props.projects.get(this.props.selectedProject);
        if (!current_project || this.state.data_timestamp === 0) return;
        const step_value = save_props.step;
        const tracking_id = current_project.id + '_' + this.state.data_timestamp + '_' + step_value;
        const is_image =
            this.state.current_env_info.obs_space.type === 'Box' && this.state.current_env_info.obs_space.is_image;
        const has_state_loading = this.state.interpret_obs_as_state;
        const add_item = {
            tracking_id: tracking_id,
            exp: { id: -1, exp_name: current_project.project_name },
            exp_name: current_project.project_name,
            env: { name: this.state.selected_env.name, id: this.state.selected_env.id },
            obs: this.state.dataset_sample.sampled_obs[step_value],
            is_image: is_image,
            step_value: step_value,
            has_state_loading: has_state_loading,
            state: 0,
            interpret_obs_as_state: this.state.interpret_obs_as_state ? 1 : 0,
            dataset_sample_index: save_props.dataset_index,
        };
        this.setState({ dataset_tracking_item: new_item });
    }

    /**
     * Add the currently selected step in the benchmarked env. to the list of tracked items.
     * If the observation is an image, save it in the backend instead. This leads to less
     * items saved in the database.
     */
    addCurrentSelectionToTrackingItem() {
        // First select the tab, add process is different for benchmarked env or dataset
        const new_items = this.state.tracking_items;
        let tracking_id;
        let step_value;
        let add_item = {};
        let mode = 'obs';
        const has_state_loading = this.state.selected_env.has_state_loading ? 1 : 0;
        const is_image =
            this.state.current_env_info.obs_space.type === 'Box' && this.state.current_env_info.obs_space.is_image;
        if (this.state.active_tab == 'environment') {
            if (this.state.data_timestamp === 0 || this.state.current_exp_name === '') return;
            step_value = this.state.current_highlight_steps.new.value;
            tracking_id = this.state.current_exp_name + '_' + this.state.data_timestamp + '_' + step_value;
            mode = has_state_loading ? 'state' : 'obs';
            if (new_items.has(tracking_id)) return; // if we have already added this step, dont add again
            add_item = {
                tracking_id: tracking_id,
                exp: { id: -1, exp_name: this.state.current_exp_name },
                exp_name: this.state.current_exp_name,
                env: { name: this.state.selected_env.name, id: this.state.selected_env.id },
                obs: this.state.current_benchmark_results.obs[step_value],
                is_image: is_image,
                step_value: step_value,
                has_state_loading: has_state_loading,
                interpret_obs_as_state: false,
                state: 0,
                dataset_sample_index: -1,
            };
        } else if (this.state.active_tab == 'dataset') {
            add_item = this.state.dataset_tracking_item;
            console.log(add_item);
            tracking_id = add_item.tracking_id;
            mode = 'dataset';
        }
        new_items.set(tracking_id, add_item);
        if (is_image || has_state_loading) {
            axios
                .post(
                    '/routing/save_current_obs_to_tracking?=obs_steps' +
                        step_value +
                        '&tracking_id=' +
                        tracking_id +
                        '&mode=' +
                        mode +
                        '&dataset_path=' +
                        this.state.dataset_path
                )
                .then(
                    this.setState({ tracking_items: new_items }, () => {
                        add_item.obs = '';
                        axios.post('/routing/register_tracking_item', add_item);
                    })
                );
        } else {
            this.setState({ tracking_items: new_items }, () => axios.post('/routing/register_tracking_item', add_item));
        }
    }

    selectDatapoint(datapoint_id, dataset_index) {
        this.setState(
            { selected_datapoint_id: datapoint_id, selected_dataset_index: dataset_index }
            //this._addCurrentSelectionToTrackingItem({ step: datapoint_id, dataset_index: dataset_index })
        );
    }

    deleteTrackingItem(id) {
        const new_items = this.state.tracking_items;
        new_items.delete(id);
        axios.get('/routing/remove_tracking_item?tracking_id=' + id).then(this.setState({ tracking_items: new_items }));
    }

    changeSequenceSlider(event) {
        const seq_length = event.target.value;
        this.setState({ tsne_sequence_length: seq_length });
    }

    render() {
        return (
            <Row>
                <Setup_Sidebar
                    mode="dataset"
                    projects={this.props.projects}
                    setProject={this.props.setProject}
                    selectedProject={this.props.selectedProject}
                    setSidebarProp={this.setSidebarProp.bind(this)}
                    onBenchmarkButton={this.loadDataset.bind(this)}
                    currentSpaceInfo={this.state.current_env_info}
                    trackingItems={[]}
                    deleteTrackingItem={this.deleteTrackingItem.bind(this)}
                    addCurrentSelection={this.selectDatapoint.bind(this)}
                />
                <Col md={10}>
                    <Setup_Dataset_Embedding
                        datasetEmbedding={this.state.dataset_sample.embedding}
                        selectDatapoint={this.selectDatapoint.bind(this)}
                        dataTimestamp={this.state.data_timestamp}
                        selected={this.state.selected_datapoint_id}
                        dataPointIndices={this.state.datapoint_indices}
                        datasetLength={this.state.dataset_length}
                    />
                    <div style={{ display: this.state.data_timestamp === 0 ? 'none' : 'inline' }}>
                        <Setup_Dataset_Widget
                            envName={this.state.selected_env.name}
                            datasetPath={this.state.dataset_path}
                            currentEvalResults={this.state.dataset_sample}
                            dataTimestamp={this.state.data_timestamp}
                            step={this.state.selected_datapoint_id}
                            requestRendering={this.state.request_rendering}
                            envInfo={this.state.current_env_info}
                            stepsPerSample={this.state.steps_per_sample}
                        />
                    </div>
                    <div className="embedding_wrapper_div">
                        {!this.state.spaces_do_fit && (
                            <Alert key="spaces_alert" variant="danger">
                                The shape of the dataset and the selected environment do not match! Environment
                                Obs.Space Shape: {this.state.current_env_info.obs_space.shape} | Environment
                                Action.Space Shape: {this.state.current_env_info.action_space.shape}
                                Dataset Obs.Space Shape: {this.state.current_dataset_info.obs_space.shape} | Dataset
                                Action.Space Shape: {this.state.current_dataset_info.action_space.shape}
                            </Alert>
                        )}
                    </div>
                </Col>
            </Row>
        );
    }
}
