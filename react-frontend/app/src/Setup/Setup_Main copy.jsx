import React, { Component } from 'react';
import axios from 'axios';
import { Container, Row, Col, Tabs, Tab } from 'react-bootstrap';
import Setup_Sidebar from './Setup_Sidebar';
import Setup_Top_Row from './Setup_Top_Row';
import Setup_Dataset_View from './Setup_Dataset_View';
import '../css/Setup.module.css';
import Step_Player from '../Common/Step_Player';
import Setup_Bottom_Row from './Setup_Bottom_Row';

/**
 * Main component of the setup page. No shared state to other parts of the application.
 * Contains references to all submodules such as the sidebar, env and space widgets,
 * reward timeline and player etc. Contains most data handling functions,
 * i.e. button callbacks, data loading from server.
 */
export default class setup_main extends Component {
    constructor(props) {
        super(props);

        this.state = {
            current_exp_name: '',
            selected_framework_name: null,
            selected_algorithm: 'A2C',
            selected_env: { name: '', id: -1, has_state_loading: false },
            current_benchmark_results: { obs: [], rews: [], dones: [], actions: [] },
            dataset_path: '',
            dataset_sample_size: 1,
            dataset_sample: { obs: [], actions: [] },
            dataset_tracking_item: undefined,
            current_env_info: { obs_space: undefined, action_space: undefined },
            data_timestamp: 0,
            benchmark_time: { nr_of_steps: 0, benchmark_time: 0 },
            current_highlight_steps: {
                previous: { bottom: 0, top: 1023, value: 0 },
                new: { bottom: 0, top: 1023, value: 0 },
            },
            request_rendering: true,
            show_render_image: false,
            benchmark_steps: 1024,
            play: false,
            show_show_info_overlay: false,
            tracking_items: new Map(),
            active_tab: 'environment',
        };
    }

    componentDidMount() {
        axios.get('/routing/get_tracking_items').then((res) => {
            this.setState({ tracking_items: new Map(res.data.map((item) => [item.tracking_id, item])) });
        });
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    setTab(new_tab_key) {
        this.setState({ active_tab: new_tab_key });
    }

    /**
     * Called from the Sidebar component to update relevant state values,
     * especially for the benchmarking, env or algorithm name
     * @param {{paramter_name:paramenter_value}} updated_props
     */
    setSidebarProp(updated_props) {
        this.setState(updated_props);
    }

    /**
     * Updates the env space info, relevant after renaming obs/action space
     * names/tags or chaning the env description.
     * @param {*} updated_space_info
     */
    setCurrentExperimentSpaceInfo(updated_space_info) {
        this.setState({ current_env_info: updated_space_info });
    }

    /**
     * Called e.g. from the Step Player component to set the step value and/or
     * bounds in the benchmark timeline.
     * @param {*} new_steps
     */
    setHighlightSteps(new_steps) {
        const old_steps = this.state.current_highlight_steps;
        if (!('bottom' in new_steps))
            new_steps = { bottom: 0, top: this.state.benchmark_steps, value: new_steps.value };
        this.setState({ current_highlight_steps: { previous: old_steps.new, new: new_steps } });
    }

    /**
     * Invokes the server call to retrieve a random benchmark (random actions)
     *  of the currently selected environment.
     */
    getBenchmarkResults() {
        const n_steps = this.state.benchmark_steps;
        const rendering = this.state.request_rendering ? 1 : 0;
        axios
            .get(
                '/routing/run_benchmark?env_id=' +
                    this.state.selected_env.id +
                    '&n_steps=' +
                    n_steps +
                    '&rendering=' +
                    rendering
            )
            .then((res) => {
                const buffers = res.data;
                this.setState({
                    current_env_info: buffers.env_space_info,
                    current_benchmark_results: {
                        obs: buffers.obs,
                        rews: buffers.rews,
                        dones: buffers.dones,
                        actions: buffers.actions,
                        renders: buffers.renders,
                    },
                    data_timestamp: buffers.data_timestamp,
                    benchmark_time: { nr_of_steps: n_steps, benchmark_time: buffers.benchmark_time },
                    current_highlight_steps: {
                        previous: { bottom: 0, top: n_steps - 1, value: 0 },
                        new: { bottom: 0, top: n_steps - 1, value: 0 },
                    },
                    show_render_image: this.state.request_rendering ? true : false,
                });
            });
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

    addDatasetSelectionToTrackingItems(new_item) {
        this.setState({ dataset_tracking_item: new_item });
    }

    deleteTrackingItem(id) {
        const new_items = this.state.tracking_items;
        new_items.delete(id);
        axios.get('/routing/remove_tracking_item?tracking_id=' + id).then(this.setState({ tracking_items: new_items }));
    }

    setDatasetSample(new_sample) {
        this.setState({ dataset_sample: new_sample });
    }

    render() {
        return (
            <Container fluid>
                <Row>
                    <Setup_Sidebar
                        setSidebarProp={this.setSidebarProp.bind(this)}
                        onBenchmarkButton={this.getBenchmarkResults.bind(this)}
                        currentSpaceInfo={this.state.current_env_info}
                        trackingItems={this.state.tracking_items}
                        deleteTrackingItem={this.deleteTrackingItem.bind(this)}
                        addCurrentSelection={this.addCurrentSelectionToTrackingItem.bind(this)}
                    />
                    <Col md={10}>
                        <Tabs
                            activeKey={this.state.active_tab}
                            justify
                            id="setup_right_tabs"
                            onSelect={this.setTab.bind(this)}
                        >
                            <Tab eventKey="environment" title="Environment">
                                <Row className="justify-content-md-center">
                                    <Col md={4}>
                                        <Step_Player
                                            stepState={this.state.current_highlight_steps}
                                            setSteps={this.setHighlightSteps.bind(this)}
                                            colapsed={false}
                                        />
                                    </Col>
                                </Row>
                                <Setup_Top_Row
                                    data={this.state.current_benchmark_results}
                                    envID={this.state.selected_env.id}
                                    benchmarkTime={this.state.benchmark_time}
                                    spaceInfo={this.state.current_env_info}
                                    steps={this.state.current_highlight_steps}
                                    renderImage={this.state.show_render_image}
                                    envData={{
                                        env_name: this.state.selected_env.name,
                                        algorithm_name: this.state.selected_algorithm,
                                    }}
                                    dataTimestamp={this.state.data_timestamp}
                                    datasetSample={this.state.dataset_sample}
                                    setHighlightSteps={this.setHighlightSteps.bind(this)}
                                />
                                <Setup_Bottom_Row
                                    data={this.state.current_benchmark_results}
                                    envID={this.state.selected_env.id}
                                    benchmarkTime={this.state.benchmark_time}
                                    spaceInfo={this.state.current_env_info}
                                    setSpaceInfo={this.setCurrentExperimentSpaceInfo.bind(this)}
                                    steps={this.state.current_highlight_steps.new}
                                    renderImage={this.state.show_render_image}
                                    envData={{
                                        env_name: this.state.selected_env.name,
                                        algorithm_name: this.state.selected_algorithm,
                                    }}
                                    dataTimestamp={this.state.data_timestamp}
                                    datasetSample={this.state.dataset_sample}
                                />
                            </Tab>
                            <Tab eventKey="dataset" title="Dataset Explorer" disabled={this.state.dataset_path == ''}>
                                <Row className="justify-content-md-center">
                                    <Setup_Dataset_View
                                        key={this.state.dataset_path}
                                        selectedEnv={this.state.selected_env}
                                        datasetPath={this.state.dataset_path}
                                        envBenchmarkDataTimestamp={this.state.data_timestamp}
                                        datasetSampleSize={this.state.dataset_sample_size}
                                        requestRendering={this.state.request_rendering}
                                        setDatasetSample={this.setDatasetSample.bind(this)}
                                        addSelectionToTracker={this.addDatasetSelectionToTrackingItems.bind(this)}
                                        spaceInfo={this.state.current_env_info}
                                        expName={this.state.current_exp_name}
                                    />
                                </Row>
                            </Tab>
                        </Tabs>
                    </Col>
                </Row>
            </Container>
        );
    }
}
