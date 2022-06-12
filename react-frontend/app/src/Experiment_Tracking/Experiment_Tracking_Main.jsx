import React, { Component } from 'react';
import { Tabs, Tab, Container, Row, Col, ButtonGroup, DropdownButton, Dropdown } from 'react-bootstrap';
import Run_Browser_Linegraph from './Run_Browser_Linegraph';
import Run_Browser_Legend from './Run_Browser_Legend';
import Run_Browser_Checkpoint_Widget from './Run_Browser_Checkpoint_Widget';
import Run_Browser_Pixel_Display from './Run_Browser_Pixel_Display';
import Run_Browser_Sidebar from './Run_Browsert_Sidebar';
import Run_Browser_Training_Modal from './Run_Browser_Training_Modal';
import axios from 'axios';
import '../css/Run_Browser.module.css';

/***
 * Main component of the run browser.
 */
export default class run_main extends Component {
    constructor(props) {
        super(props);

        this.state = {
            active_tab: 'performance_view',
            experiments: [],
            visible_experiment_ids: [],
            exp_id_array: [],
            highlighted_row_indices: [],
            grouped_row_indices: [],
            combined_row_indices: [],
            ep_reward_data: [],
            show_training_modal: false,
            show_checkpoint_widget: false,
            checkpoint_eval_step: 0,
            checkpoint_exp_array_id: 0,
            callbackFrequencies: [],
            display_mode: 'linegraph',
            tracking_items: new Map(),
            current_item: undefined,
            checkpoint_exp_array_id: -1,
        };
    }

    componentDidMount() {
        this.updateExperiments();
        axios.get('/routing/get_tracking_items').then((res) => {
            this.setState({ tracking_items: new Map(res.data.map((item) => [item.tracking_id, item])) });
        });
        //this.interval = setInterval(() => this.updateExperiments(), 15000); // update data every 15s
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

    updateExperiments() {
        axios.get('/routing/get_experiments').then((res) => {
            const exps = res.data;
            const callback_frequencies = exps.map((exp) => exp.callback_frequency);
            const exp_ids = [];
            exps.map((exp) => exp.id).forEach((id) => {
                exp_ids.push(id);
            });
            this.setState(
                {
                    experiments: exps,
                    callbackFrequencies: callback_frequencies,
                    exp_id_array: exp_ids,
                    visible_experiment_ids: exp_ids,
                },
                this.getEpRewardData
            );
        });
    }

    toggleTrainingModal() {
        const show_training_modal = !this.state.show_training_modal;
        this.setState({ show_training_modal: show_training_modal });
    }

    getEpRewardData() {
        axios
            .get(
                '/routing/get_ep_rewards?exp_ids=' +
                    JSON.stringify(this.state.experiments.map((x) => x.id)) +
                    '&max_elements=500'
            )
            .then((res) => {
                const ep_rew_data = res.data;
                this.setState({ ep_reward_data: ep_rew_data });
            });
    }

    removeExperiment(exp_id) {
        axios.get('/routing/remove_experiment?exp_id=' + exp_id).then(this.updateExperiments());
    }

    filterRows(new_rows) {
        const exps = this.state.experiments;
        const exp_ids = [];
        // Display filtered rows OR rows that are currently combined into a new data row
        exps.map((exp) => exp.id)
            .filter((id) => new_rows.map((x) => x.id).includes(id) || this.state.combined_row_indices.includes(id))
            .forEach((id) => {
                exp_ids.push(id);
            });
        this.setState({ visible_experiment_ids: exp_ids });
    }

    onCallbackDataClick(row_id, callback_step) {
        this.setState({
            checkpoint_exp_array_id: row_id,
            checkpoint_eval_step: callback_step,
            show_checkpoint_widget: true,
        });
    }

    setHighlightedRows(row_id, isSelect) {
        if (isSelect) {
            this.setState(() => ({
                highlighted_row_indices: [...this.state.highlighted_row_indices, row_id].sort(),
            }));
        } else {
            this.setState(() => ({
                highlighted_row_indices: this.state.highlighted_row_indices.filter((x) => x !== row_id),
            }));
        }
    }

    toogle;

    toggleAllHighlights(is_selected) {
        if (
            (typeof is_selected === 'boolean' && is_selected) ||
            this.state.highlighted_row_indices.length < this.state.exp_id_array.length
        )
            this.setState({ highlighted_row_indices: this.state.experiments.map((exp) => exp.id) });
        else this.setState({ highlighted_row_indices: [] });
    }

    toggleCheckpointWidget() {
        const new_value = !this.state.show_checkpoint_widget;
        this.setState({ show_checkpoint_widget: new_value });
    }

    changeDisplayMode(new_mode) {
        const mode = new_mode;
        this.setState({ display_mode: mode });
    }

    activeRowsToGroup() {
        if (this.state.grouped_row_indices.length > 0) {
            this.setState({ grouped_row_indices: [] });
        } else {
            const new_grouped_indices = this.state.highlighted_row_indices;
            this.setState({ grouped_row_indices: new_grouped_indices });
        }
    }

    combineRows() {
        if (this.state.combined_row_indices.length > 0) {
            this.setState({ combined_row_indices: [] });
        } else {
            const new_combined_row_indices = this.state.highlighted_row_indices;
            this.setState({ combined_row_indices: new_combined_row_indices });
        }
    }

    updateTrackingItem() {
        axios.get('/routing/get_tracking_items').then((res) => {
            this.setState({ tracking_items: new Map(res.data.map((item) => [item.tracking_id, item])) });
        });
    }

    /**
     * Add the currently selected step in the benchmarked Env to the list of tracked items.
     * If the observation is an image, save it in the backend instead. This leads to less
     * items saved in the database.
     */
    addCurrentSelectionToTrackingItems() {
        // if we do not have any data, do not add to list
        if (this.state.current_item === undefined) return;
        const new_items = this.state.tracking_items;
        const current_item = this.state.current_item;
        const step_value = current_item.step_value;
        const tracking_id = current_item.experiment_name + '_' + current_item.data_timestamp + '_' + step_value;
        const is_image =
            current_item.env_space_info.obs_space.type === 'Box' && current_item.env_space_info.obs_space.is_image;
        if (new_items.has(tracking_id)) return; // if we have already added this step, dont add again
        const add_item = {
            tracking_id: tracking_id,
            exp: { id: current_item.experiment_id, exp_name: current_item.experiment_name },
            env: { name: current_item.env_name, id: current_item.env_id },
            obs: current_item.obs,
            is_image: is_image,
            step_value: step_value,
        };
        new_items.set(tracking_id, add_item);
        if (is_image) {
            axios
                .post('/routing/save_current_obs_to_tracking?=obs_steps' + step_value + '&tracking_id=' + tracking_id)
                .then(this.setState({ tracking_items: new_items }), () => {
                    add_item.obs = '';
                    axios.post('/routing/register_tracking_item', add_item);
                });
        } else {
            this.setState({ tracking_items: new_items }, () => axios.post('/routing/register_tracking_item', add_item));
        }
    }

    deleteTrackingItem(id) {
        const new_items = this.state.tracking_items;
        new_items.delete(id);
        axios.get('/routing/remove_tracking_item?tracking_id=' + id).then(this.setState({ tracking_items: new_items }));
    }

    setCurrentItem(item) {
        this.setState({ current_item: item });
    }

    render() {
        const arr_idx_filter_function = (d, i) => {
            return this.state.visible_experiment_ids.includes(this.state.exp_id_array[i]);
        };
        const id_filter_function = (exp) => {
            return this.state.visible_experiment_ids.includes(exp.id);
        };

        return (
            <div>
                <Container fluid="true">
                    <Row>
                        <Run_Browser_Sidebar
                            setSidebarProp={this.setSidebarProp.bind(this)}
                            trackingItems={this.state.tracking_items}
                            deleteTrackingItem={this.deleteTrackingItem.bind(this)}
                            addCurrentSelection={this.addCurrentSelectionToTrackingItems.bind(this)}
                            toggleTrainingModel={this.toggleTrainingModal.bind(this)}
                        />
                        <Col md={10}>
                            <Tabs
                                activeKey={this.state.active_tab}
                                justify
                                id="run_browser_tabs"
                                onSelect={this.setTab.bind(this)}
                            >
                                <Tab eventKey="performance_view" title="Training Performance Overview">
                                    <Row noGutters>
                                        <Col md={10}>
                                            <DropdownButton
                                                as={ButtonGroup}
                                                onSelect={this.changeDisplayMode.bind(this)}
                                                variant="link"
                                                title="Display Mode"
                                            >
                                                <Dropdown.Item
                                                    eventKey="linegraph"
                                                    active={this.state.display_mode === 'linegraph'}
                                                >
                                                    Line Graph
                                                </Dropdown.Item>
                                                <Dropdown.Item
                                                    eventKey="pixel_display"
                                                    active={this.state.display_mode === 'pixel_display'}
                                                >
                                                    Pixel Display
                                                </Dropdown.Item>
                                            </DropdownButton>

                                            {this.state.display_mode === 'linegraph' ? (
                                                <Run_Browser_Linegraph
                                                    data={this.state.ep_reward_data.filter(arr_idx_filter_function)}
                                                    getCallbackData={this.onCallbackDataClick.bind(this)}
                                                    highlightedRows={this.state.highlighted_row_indices}
                                                    combinedRows={this.state.combined_row_indices}
                                                    indexMap={this.state.exp_id_array.filter(arr_idx_filter_function)}
                                                    callbackFrequencies={this.state.callbackFrequencies.filter(
                                                        arr_idx_filter_function
                                                    )}
                                                />
                                            ) : (
                                                <Run_Browser_Pixel_Display
                                                    data={this.state.ep_reward_data.filter(arr_idx_filter_function)}
                                                    getCallbackData={this.onCallbackDataClick.bind(this)}
                                                    highlightedRows={this.state.highlighted_row_indices}
                                                    indexMap={this.state.exp_id_array.filter(arr_idx_filter_function)}
                                                    callbackFrequencies={this.state.callbackFrequencies.filter(
                                                        arr_idx_filter_function
                                                    )}
                                                    experimentStrings={this.state.experiments
                                                        .filter(id_filter_function)
                                                        .map((exp) => exp.exp_name)}
                                                    groupedRowIndices={this.state.grouped_row_indices}
                                                />
                                            )}
                                        </Col>
                                        <Col md={{ span: 2, offset: 0 }}>
                                            <Run_Browser_Legend
                                                inExperiments={this.state.experiments.filter(id_filter_function)}
                                                onHighlight={this.setHighlightedRows.bind(this)}
                                                highlightedRows={this.state.highlighted_row_indices}
                                                activeRowsToGroup={this.activeRowsToGroup.bind(this)}
                                                groupedRowIndices={this.state.grouped_row_indices}
                                                combineRows={this.combineRows.bind(this)}
                                                combinedRowIndices={this.state.combined_row_indices}
                                                toggleAllRows={this.toggleAllHighlights.bind(this)}
                                            />
                                        </Col>
                                    </Row>
                                    <Row className="justify-content-md-center">
                                        <Col className="table_div"></Col>
                                    </Row>
                                    <div hidden={!this.state.show_checkpoint_widget} style={{ height: 0 }}>
                                        <Run_Browser_Checkpoint_Widget
                                            toggleCheckpointWidget={this.toggleCheckpointWidget.bind(this)}
                                            experiments={this.state.experiments}
                                            checkpointExpId={this.state.checkpoint_exp_array_id}
                                            expIdArray={this.state.exp_id_array}
                                            evalStep={this.state.checkpoint_eval_step}
                                            checkpointEvalSteps={this.state.checkpoint_eval_step}
                                            setCurrentItem={this.setCurrentItem.bind(this)}
                                        />
                                    </div>
                                </Tab>
                                <Tab eventKey="trajectory_embedding_view" title="Trajectory Embedding">
                                    <div></div>
                                </Tab>
                            </Tabs>
                        </Col>
                    </Row>
                </Container>
                {this.state.show_training_modal && (
                    <Run_Browser_Training_Modal closeModal={this.toggleTrainingModal.bind(this)} />
                )}
            </div>
        );
    }
}
