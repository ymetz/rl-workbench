import React, { Component } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import '../css/Evaluation.module.css';
import { config } from '../app_config';
import Evaluation_Sidebar from './Evaluation_Sidebar';
import Evaluation_Reward_Graph from './Evaluation_Reward_Graph';
import Evaluation_Embedding from './Evaluation_Embedding';
import Checkpoint_Controls from './Checkpoint_Controls';
import Step_Player from '../Common/Step_Player';
import Evaluation_Widget from './Evaluation_Widget';
import Time_Line from '../Common/Time_Line';

/***
 * Main Component of the Evaluation Page
 */
export default class evaluation_main extends Component {
    user_study_mode = true;

    constructor(props) {
        super(props);

        this.state = {
            projects: new Map(),
            selected_project_id: -1,
            experiments: [],
            experiment_ids: [],
            selected_experiment: { id: 0, num_timesteps: 0, exp_name: '' },
            primary_env: { id: 0, env_name: '' },
            secondary_env: undefined,
            selected_datapoint_id: 0,
            selected_checkpoint_timestep: 0,
            checkpoint_options: [{ value: 0, label: 0 }],
            benchmark_steps: 1024,
            sample_all_checkpoints: false,
            n_episodes: 1,
            benchmark_n_episodes: 1,
            benchmark_total_episodes: 1,
            benchmarked_models: new Map(),
            show_policy_view: false,
            append_time: false,
            current_benchmark_results: {
                obs: [],
                rews: [],
                dones: [],
                actions: [],
                infos: [{ dummy: 0 }],
                done_indices: [],
                label_infos: [],
                attr: [],
                probabilities: [],
                episode_lengths: [],
                episode_rewards: [],
                env_space_info: { obs_space: undefined, action_space: undefined },
                n_episodes: 1,
                data_sampled_all_checkpoints: false,
            },
            reward_comparison_curve: [],
            data_timestamp: 0,
            benchmark_time: { nr_of_steps: 0, benchmark_time: 0 },
            current_highlight_steps: {
                previous: { bottom: 0, top: 1023, value: 0 },
                new: { bottom: 0, top: 1023, value: 0 },
            },
            highlightHiddenMap: [],
            hidden_step_ranges: [],
            highlighted_step_ranges: [],
            excluded_episodes: [],
            exp_id_to_exp_index: {},
            environments: [],
            reset_state: false,
            request_rendering: true,
            deterministic_evaluation: true,
            request_use_latent_features: false,
            request_reproject: false,
            request_explainer: false,
            show_compare_envs: false,
            show_eval_widget: true,
            tracking_items: new Map(),
            embedding_method: 'UMAP',
            embedding_axis_option: '2D embedding',
            embedding_settings: {},
            clusteringMode: false,
        };
    }

    componentDidMount() {
        axios.get('/routing/get_projects').then((res) => {
            this.setState({ projects: new Map(res.data.map((item) => [item.id, item])) });
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

    setProject(new_project_id) {
        if (new_project_id && Array.from(this.state.projects.keys()).includes(new_project_id.key)) {
            this.setState({ selected_project_id: new_project_id.key });
        }
    }

    setHighlightSteps(new_steps) {
        const old_steps = this.state.current_highlight_steps;
        this.setState({ current_highlight_steps: { previous: old_steps.new, new: new_steps } });
    }

    setSelectedCheckpoint(new_checkpoint) {
        this.setState({ selected_checkpoint_timestep: new_checkpoint });
    }

    setShowPolicyView(callback) {
        this.setState({ show_policy_view: true }, callback);
    }

    hideStepRange(range) {
        const map = this.state.highlightHiddenMap;
        map.fill(-1, range[0], range[1] + 1);
        console.log('hide', range, map);
        this.setState({ highlightHiddenMap: map });
        /*let old_ranges = this.state.hidden_step_ranges;
        old_ranges.push(range);
        this.setState({hidden_step_ranges: old_ranges})*/
        //console.log(this.state.hidden_step_ranges);
    }

    setClusteringMode(mode) {
        const map = this.state.highlightHiddenMap;

        if (mode) {
            for (const i in map) {
                if (map[i] < 0) map[i] = 0;
            }
        }

        this.setState({ clusteringMode: mode, highlightHiddenMap: map });
    }

    highlightStepRange(range) {
        const map = this.state.highlightHiddenMap;
        map.fill(1, range[0], range[1] + 1);
        this.setState({ highlightHiddenMap: map });
        /*let old_ranges = this.state.highlighted_step_ranges;
         old_ranges.push(range);
         this.setState({highlighted_step_ranges: old_ranges})*/
    }

    resetHighlightingFilter() {
        /*this.setState({hidden_step_ranges: []})
        this.setState({highlighted_step_ranges: []})*/
        const map = this.state.highlightHiddenMap;
        map.fill(0);
        this.setState({ highlightHiddenMap: map });
    }

    updateExcludedEpisodes(episode) {
        if (this.state.excluded_episodes.includes(episode)) {
            const new_episodes = this.state.excluded_episodes.filter((item) => item !== episode);
            this.setState({ excluded_episodes: new_episodes });
        } else {
            this.setState({ excluded_episodes: [...this.state.excluded_episodes, episode] });
        }
    }

    updateExcludedEpisodesMultiple(episodes, remove = false) {
        if (episodes === undefined) return;
        // Add if not already in the list
        let new_episodes = [...this.state.excluded_episodes];

        if (remove) {
            for (let i = 0; i < episodes.length; i++) {
                if (new_episodes.includes(episodes[i])) {
                    new_episodes = new_episodes.filter((item) => item !== episodes[i]);
                }
            }
        } else {
            for (let i = 0; i < episodes.length; i++) {
                if (!new_episodes.includes(episodes[i])) {
                    new_episodes.push(episodes[i]);
                }
            }
        }
        this.setState({ excluded_episodes: new_episodes });
    }

    toggleExclusion() {
        if (this.state.excluded_episodes.length > 0) {
            this.setState({ excluded_episodes: [] });
        } else {
            this.setState({
                excluded_episodes: Array.from({ length: this.state.benchmark_total_episodes }, (v, k) => k),
            });
        }
    }

    deleteBenchmarkedModel(model_id) {
        const new_benchmarked_models = new Map(this.state.benchmarked_models);
        new_benchmarked_models.delete(model_id);
        this.setState({ benchmarked_models: new_benchmarked_models });
    }

    selectDatapoint(new_steps) {
        const old_steps = this.state.current_highlight_steps;
        if (!('bottom' in new_steps))
            new_steps = { bottom: 0, top: this.state.benchmark_steps, value: new_steps.value };
        this.setState({ current_highlight_steps: { previous: old_steps.new, new: new_steps } });
    }

    getEpisodeIndices() {
        if (this.state.sample_all_checkpoints) {
            const episodes_per_run = this.state.benchmark_total_episodes / this.state.checkpoint_options.length;
            if (!Number.isInteger(episodes_per_run)) {
                return [];
            }
            const chose_index = this.state.checkpoint_options
                .map((o) => o.value)
                .indexOf(this.state.selected_checkpoint_timestep);
            const selected_episode_start = chose_index * episodes_per_run;

            return Array.from({ length: episodes_per_run }, (v, k) => k + selected_episode_start);
        }

        return Array.from({ length: this.state.benchmark_total_episodes }, (v, k) => k).filter(
            (v) => !this.state.excluded_episodes.includes(v)
        );
    }

    getCheckpointEpisodeMap() {
        const map = new Map();
        if (!this.state.sample_all_checkpoints) {
            map.set(this.state.selected_checkpoint_timestep, this.getEpisodeIndices());
            return map;
        }

        for (let i = 0; i < this.state.checkpoint_options.length; i++) {
            map.set(this.state.checkpoint_options[i].value, [
                Array.from(
                    { length: this.state.benchmark_n_episodes },
                    (v, k) => k + i * this.state.benchmark_n_episodes
                ),
            ]);
        }
        return map;
    }

    getEpisodeIndexFromStepValue(step_value) {
        const done_idx = this.state.current_benchmark_results.done_indices;
        return done_idx.findIndex((idx) => idx > step_value);
    }

    /*
     * The Infos can contain labels for particular states which we collect here.
     * Return a list of all labels with the corresponding ids.
     */
    getLabelsFromInfos(infos) {
        const labels = [];
        for (const info of infos) {
            if (info.label) {
                if (!labels.includes(info.label)) {
                    labels.push({ label: info.label, ids: [info.id] });
                } else {
                    labels[labels.map((l) => l.label).indexOf(info.label)].ids.push(info.id);
                }
            }
        }
        return labels;
    }

    /**
     *
     * @param {*} add_to_current
     */
    computeAdditionalInfoValues() {
        // Based on total number of steps, compute the number of steps until next done index
        const info_values = this.state.current_benchmark_results.infos;
        let current_done_idx = 0;
        for (let i = 0; i < this.state.current_benchmark_results.infos.length; i++) {
            if (i == this.state.current_benchmark_results.done_indices[current_done_idx]) {
                info_values[i]['steps until done'] = Math.floor(
                    this.state.current_benchmark_results.done_indices[current_done_idx + 1] - i
                );
                current_done_idx++;
            } else {
                info_values[i]['steps until done'] = Math.floor(
                    this.state.current_benchmark_results.done_indices[current_done_idx] - i
                );
            }
            info_values[i]['episode index'] = current_done_idx;
            info_values[i]['action'] = this.state.current_benchmark_results.actions[i];
            info_values[i]['action probability'] =
                this.state.current_benchmark_results.probabilities[i][this.state.current_benchmark_results.actions[i]];
            if (this.state.sample_all_checkpoints)
                info_values[i]['checkpoint index'] = Math.floor(
                    current_done_idx / this.state.checkpoint_options.length
                );
        }
        this.setState({
            current_benchmark_results: { ...this.state.current_benchmark_results, infos: info_values },
            label_infos: this.getLabelsFromInfos(info_values),
        });
    }

    benchmarkTrainedModel(add_to_current) {
        const n_episodes = this.state.n_episodes;
        const reset_state = this.state.reset_state ? 1 : 0;
        const exp_id = this.state.selected_experiment.id;
        const checkpoint_step = this.state.selected_checkpoint_timestep;
        const rendering = this.state.request_rendering ? 1 : 0;
        const deterministic_evaluation = this.state.deterministic_evaluation ? 1 : 0;
        const explainer = this.state.request_explainer ? 1 : 0;
        const set_add_to_current = add_to_current ? 1 : 0;
        const sample_all_checkpoints = this.state.sample_all_checkpoints ? 1 : 0;
        const env_id = this.state.primary_env.id;
        axios
            .get(
                '/routing/run_benchmark?env_id=' +
                    env_id +
                    '&add_to_current=' +
                    set_add_to_current +
                    '&run_trained_model=1&exp_id=' +
                    exp_id +
                    '&deterministic_evaluation=' +
                    deterministic_evaluation +
                    '&n_episodes=' +
                    n_episodes +
                    '&rendering=' +
                    rendering +
                    '&sample_all_checkpoints=' +
                    sample_all_checkpoints +
                    '&checkpoint_timestep=' +
                    checkpoint_step +
                    '&run_explainer=' +
                    explainer +
                    '&reset_state=' +
                    reset_state
            )
            .then((res) => {
                const buffers = res.data;
                const n_steps = buffers.n_steps;
                this.setState({
                    current_benchmark_results: {
                        obs: buffers.obs,
                        rews: buffers.rews,
                        dones: buffers.dones,
                        actions: buffers.actions,
                        infos: buffers.infos,
                        label_infos: this.getLabelsFromInfos(buffers.infos),
                        done_indices: buffers.dones.reduce((a, elem, i) => (elem === true && a.push(i), a), []),
                        renders: buffers.renders,
                        attr: buffers.attr,
                        probabilities: buffers.probabilities,
                        episode_rewards: buffers.episode_rewards,
                        episode_lengths: {
                            lengths: buffers.episode_lengths,
                            cummulative: buffers.episode_lengths.reduce((a, x, i) => [...a, x + (a[i - 1] || 0)], []),
                        },
                        env_space_info: buffers.env_space_info,
                    },
                    data_timestamp: buffers.data_timestamp,
                    excluded_episodes: [],
                    benchmark_time: { nr_of_steps: n_steps, benchmark_time: buffers.benchmark_time },
                    current_highlight_steps: {
                        previous: { bottom: 0, top: n_steps - 1, value: 0 },
                        new: { bottom: 0, top: n_steps - 1, value: 0 },
                    },
                    show_render_image: this.state.request_rendering ? true : false,
                    highlightHiddenMap: new Array(n_steps).fill(0),
                    benchmark_steps: n_steps,
                    benchmark_n_episodes: n_episodes,
                    benchmark_total_episodes: buffers.dones.filter(Boolean).length,
                    benchmarked_models: [
                        ...this.state.benchmarked_models,
                        {
                            model_id: this.state.benchmarked_models.size + 1,
                            checkpoint_step: checkpoint_step,
                            model_name: this.state.selected_experiment.exp_name,
                        },
                    ],
                });
                this.computeAdditionalInfoValues();
            });

        axios
            .get(
                '/routing/run_benchmark?env_id=' +
                    env_id +
                    '&n_episodes=' +
                    n_episodes +
                    '&only_rews=1' +
                    '&reset_state=' +
                    reset_state
            )
            .then((res) => {
                const buffers = res.data;
                this.setState({
                    reward_comparison_curve: buffers.rews,
                });
            });
    }

    saveToFile() {
        console.log('[INFO] Save To File');
        axios.post(
            '/routing/save_current_benchmark_results_tp_file?exp_id=' +
                this.state.selected_experiment.id +
                '&checkpoint_timestep=' +
                this.state.selected_checkpoint_timestep
        );
    }

    render() {
        return (
            <div>
                <Container fluid="true">
                    <Row>
                        <Evaluation_Sidebar
                            mode="evaluation"
                            projects={this.state.projects}
                            benchmarkedModels={this.state.benchmarked_models}
                            deleteModel={this.deleteBenchmarkedModel.bind(this)}
                            setProject={this.setProject.bind(this)}
                            selectedProject={this.state.selected_project_id}
                            setSidebarProp={this.setSidebarProp.bind(this)}
                            onBenchmarkButton={this.benchmarkTrainedModel.bind(this)}
                            saveToFile={this.saveToFile.bind(this)}
                        />
                        <Col md={10}>
                            <Row>
                                <Col md={9}>
                                    <Row style={{ height: '60vh' }}>
                                        <Col>
                                            <Checkpoint_Controls
                                                sampledAllCheckpoints={this.state.sample_all_checkpoints}
                                                checkpointTimesteps={this.state.checkpoint_options}
                                                finalTimestep={this.state.selected_experiment.num_timesteps}
                                                selected_checkpoint_timestep={this.state.selected_checkpoint_timestep}
                                                setSelectedCheckpoint={this.setSelectedCheckpoint.bind(this)}
                                            />
                                            <Row style={{ height: '55vh' }}>
                                                <Col
                                                    md={this.state.show_policy_view ? 6 : 12}
                                                    style={{ paddingLeft: 0, paddingRight: 0 }}
                                                >
                                                    <Evaluation_Embedding
                                                        fullWidth={!this.state.show_policy_view}
                                                        embeddingAxisOption={this.state.embedding_axis_option}
                                                        embeddingMethod={this.state.embedding_method}
                                                        embeddingSettings={this.state.embedding_settings}
                                                        selectDatapoint={this.selectDatapoint.bind(this)}
                                                        currentRewardData={this.state.current_benchmark_results.rews}
                                                        infoTypes={Object.keys(
                                                            this.state.current_benchmark_results.infos[0]
                                                        ).filter((info) => !['dummy', 'label', 'id'].includes(info))}
                                                        currentDoneData={this.state.current_benchmark_results.dones}
                                                        currentInfoData={this.state.current_benchmark_results.infos}
                                                        infos={this.state.current_benchmark_results.infos}
                                                        useLatentFeature={this.state.request_use_latent_features}
                                                        reproject={this.state.request_reproject}
                                                        selectedEnv={this.state.primary_env.id}
                                                        selectedExp={this.state.selected_experiment.id}
                                                        selectedCheckpoint={this.state.selected_checkpoint_timestep}
                                                        timeStamp={this.state.data_timestamp}
                                                        sampledAllCheckpoints={this.state.sample_all_checkpoints}
                                                        visibleEpisodes={this.getEpisodeIndices(
                                                            this.state.current_benchmark_results.dones
                                                        )}
                                                        selectedTimestep={this.state.selected_checkpoint_timestep}
                                                        selectedEpisode={this.getEpisodeIndexFromStepValue(
                                                            this.state.current_highlight_steps.new.value
                                                        )}
                                                        highlightedEpisodes={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                                                        highlightSteps={this.state.current_highlight_steps}
                                                        highlightHiddenMap={this.state.highlightHiddenMap}
                                                        labelInfo={this.state.current_benchmark_results.label_infos}
                                                        setClusteringMode={this.setClusteringMode.bind(this)}
                                                        experimentName={this.state.selected_experiment.exp_name}
                                                        onShowPolicyView={this.setShowPolicyView.bind(this)}
                                                    />
                                                </Col>
                                                {this.state.show_policy_view && (
                                                    <Col
                                                        md={6}
                                                        style={{
                                                            borderLeft: '1px solid #999999',
                                                            paddingLeft: 0,
                                                            paddingRight: 0,
                                                        }}
                                                    >
                                                        <Evaluation_Embedding
                                                            fullWidth={!this.state.show_policy_view}
                                                            embeddingAxisOption={this.state.embedding_axis_option}
                                                            embeddingMethod={this.state.embedding_method}
                                                            embeddingSettings={this.state.embedding_settings}
                                                            selectDatapoint={this.selectDatapoint.bind(this)}
                                                            currentRewardData={
                                                                this.state.current_benchmark_results.rews
                                                            }
                                                            infos={this.state.current_benchmark_results.infos}
                                                            infoTypes={Object.keys(
                                                                this.state.current_benchmark_results.infos[0]
                                                            ).filter(
                                                                (info) => !['dummy', 'label', 'id'].includes(info)
                                                            )}
                                                            currentDoneData={this.state.current_benchmark_results.dones}
                                                            currentInfoData={this.state.current_benchmark_results.infos}
                                                            useLatentFeature={true}
                                                            reproject={false}
                                                            selectedEnv={this.state.primary_env.id}
                                                            selectedExp={this.state.selected_experiment.id}
                                                            selectedCheckpoint={this.state.selected_checkpoint_timestep}
                                                            timeStamp={this.state.data_timestamp}
                                                            sampledAllCheckpoints={this.state.sample_all_checkpoints}
                                                            visibleEpisodes={this.getEpisodeIndices(
                                                                this.state.current_benchmark_results.dones
                                                            )}
                                                            selectedTimestep={this.state.selected_checkpoint_timestep}
                                                            selectedEpisode={this.getEpisodeIndexFromStepValue(
                                                                this.state.current_highlight_steps.new.value
                                                            )}
                                                            highlightedEpisodes={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                                                            highlightSteps={this.state.current_highlight_steps}
                                                            highlightHiddenMap={this.state.highlightHiddenMap}
                                                            labelInfo={this.state.current_benchmark_results.label_infos}
                                                            setClusteringMode={this.setClusteringMode.bind(this)}
                                                            experimentName={this.state.selected_experiment.exp_name}
                                                            onShowPolicyView={this.setShowPolicyView.bind(this)}
                                                        />
                                                    </Col>
                                                )}
                                            </Row>
                                        </Col>
                                    </Row>
                                    <Row
                                        style={{
                                            height: '32vh',
                                            borderTop: '1px solid #999999',
                                            marginTop: '8px',
                                            paddingTop: '5px',
                                        }}
                                    >
                                        <Col>
                                            {this.state.selected_experiment.framework !== 'imitation' ? (
                                                <Evaluation_Reward_Graph
                                                    data={[
                                                        this.state.current_benchmark_results.rews,
                                                        this.state.current_benchmark_results.dones,
                                                    ]}
                                                    infoTypes={Object.keys(
                                                        this.state.current_benchmark_results.infos[0]
                                                    ).filter((info) => !['dummy', 'label', 'id'].includes(info))}
                                                    infos={this.state.current_benchmark_results.infos}
                                                    comparisonRewardCurve={this.state.reward_comparison_curve}
                                                    lineColor={config.reward_color}
                                                    changeHighlight={this.setHighlightSteps.bind(this)}
                                                    highlightSteps={this.state.current_highlight_steps}
                                                    episodeRewards={
                                                        this.state.current_benchmark_results.episode_rewards
                                                    }
                                                    episodeLengths={
                                                        this.state.current_benchmark_results.episode_lengths
                                                    }
                                                    hiddenSteps={this.state.hidden_step_ranges}
                                                    dataAggregationMode={this.state.rew_aggr_mode}
                                                    dataTimestamp={this.state.data_timestamp}
                                                    hideNewStepRange={this.hideStepRange.bind(this)}
                                                    excludedEpisodes={this.state.excluded_episodes}
                                                    updateExcludedEpisodes={this.updateExcludedEpisodes.bind(this)}
                                                    updateExcludedEpisodesMultiple={this.updateExcludedEpisodesMultiple.bind(
                                                        this
                                                    )}
                                                    episodeCheckpointMap={this.getCheckpointEpisodeMap()}
                                                    toggleExclusion={this.toggleExclusion.bind(this)}
                                                    highlightHiddenMap={this.state.highlightHiddenMap}
                                                    // hiddenStepRanges={this.state.hidden_step_ranges}
                                                    highlightStepRange={this.highlightStepRange.bind(this)}
                                                    totalNumEpisodes={this.state.benchmark_total_episodes}
                                                    // highlightedStepRanges={this.state.highlighted_step_ranges}
                                                    resetHighlightingFilter={this.resetHighlightingFilter.bind(this)}
                                                    clusteringMode={this.state.clusteringMode}
                                                />
                                            ) : (
                                                <Time_Line
                                                    dones={this.state.current_benchmark_results.dones}
                                                    changeHighlight={this.setHighlightSteps.bind(this)}
                                                    highlightSteps={this.state.current_highlight_steps}
                                                    dataTimestamp={this.state.data_timestamp}
                                                />
                                            )}
                                        </Col>
                                    </Row>
                                    <Row
                                        style={{ borderTop: '1px solid #999999', paddingTop: '5px' }}
                                        className="justify-content-center"
                                    >
                                        <Col md={8}>
                                            <Step_Player
                                                stepState={this.state.current_highlight_steps}
                                                setSteps={this.setHighlightSteps.bind(this)}
                                                colapsed={false}
                                                extraMargin={true}
                                            />
                                        </Col>
                                    </Row>
                                </Col>
                                <Col md={3} className="widget_column">
                                    <Evaluation_Widget
                                        experimentName={this.state.selected_experiment.exp_name}
                                        primaryEnvName={this.state.primary_env.env_name}
                                        currentEvalResults={this.state.current_benchmark_results}
                                        dataTimestamp={this.state.data_timestamp}
                                        currentSteps={this.state.current_highlight_steps.new}
                                        render={this.state.request_rendering}
                                        explainer={this.state.request_explainer}
                                    />
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }
}

/*
                <Row>
                    <Col>
                        <h3>Tracked Evaluation Cases</h3>
                        <Evaluation_Test_List
                            spaceInfo={this.state.current_benchmark_results.env_space_info}
                            trackingItems={Array.from(this.state.tracking_items.values()).filter(item => item.exp_name === this.state.selected_experiment.exp_name)}
                            experimentId={this.state.selected_experiment.id}
                            selectCheckpoint={this.state.selected_checkpoint_timestep}
                            envId={this.state.primary_env.id}
                            dataTimestamp={this.state.data_timestamp}
                            render={this.state.request_rendering}
                        />
                    </Col>
                </Row>
                <Row className={(this.state.show_compare_envs) ? "" : "collapse"} style={{ borderBottom: "1px solid #a5a5a5" }}/>
*/
