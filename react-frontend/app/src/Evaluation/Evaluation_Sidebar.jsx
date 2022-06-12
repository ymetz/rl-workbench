import React, { Component } from 'react';
import axios from 'axios';
import { Form, FormControl, Row, Col, Button, Collapse } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faPlus } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import Model_Tracker from '../Common/Model_Tracker';
import bsCustomFileInput from 'bs-custom-file-input';
import { user_study_config } from '../user_study_configurations';

export default class rubrowser_sidebar extends Component {
    expert_study_mode = true;

    constructor(props) {
        super(props);
        this.expSelectRef = React.createRef();
        this.projectSelectRef = React.createRef();
        this.checkpointSelectRef = React.createRef();
        this.envSelectRef = React.createRef();

        this.state = {
            selected_project_id: -1,
            experiments: [],
            experiment_ids: [],
            selected_experiment: {},
            primary_env: undefined,
            secondary_env: undefined,
            checkpoint_options: [],
            n_episodes: 1,
            data_timestamp: 0,
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
            sample_all_checkpoints: false,
            tracking_items: new Map(),
            show_section: {
                checkpoint_selection: false,
                validation: false,
                benchmark: false,
                embedding_controls: false,
                embedding_detail_settings: false,
            },
            embedding_methods: ['UMAP', 'ParametricUMAP', 'ParametricAngleUMAP'],
            embedding_settings: {},
            embedding_method: '',
            embedding_axis_option: '2D embedding',
        };
    }

    componentDidMount() {
        axios.get('/routing/get_frameworks').then((res) => {
            const fworks = res.data;
            this.setState({ frameworks: fworks, selected_framework: fworks[0] });

            // Only get algorithms after framework
            axios.get('/routing/get_algorithms').then((res) => {
                const algos = res.data;
                this.setState({ algorithms: algos, selected_algorithm: Object.keys(algos[fworks[0]])[0] });
                this.props.setSidebarProp({
                    selected_algorithm: Object.keys(algos[fworks[0]])[0],
                    selected_framework_name: fworks[0],
                });
            });
        });

        axios.get('/routing/get_environments').then((res) => {
            const envs = res.data;
            this.setState({ environments: envs });
        });

        axios.get('routing/get_default_experiment').then((res) => {
            const default_exp = res.data;
            this.setState({ default_experiment: default_exp });
        });

        axios.get('/routing/get_experiments').then((res) => {
            const exps = res.data;
            const exp_ids = [];
            exps.map((exp) => exp.id).forEach((id) => {
                exp_ids.push(id);
            });
            this.setState({ experiments: exps, experiment_ids: exp_ids });
        });

        axios.get('/routing/get_embedding_methods').then((res) => {
            const embedding_methods = res.data;
            this.setState({ embedding_methods: embedding_methods }, () => {
                const chosen_method = embedding_methods[0];
                axios.get(`/routing/get_embedding_method_params?embedding_method=${chosen_method}`).then((res) => {
                    const params = res.data;
                    this.setState({ embedding_settings: params, embedding_method: chosen_method });
                });
            });
        });

        bsCustomFileInput.init();
    }

    toggleSection(section_name) {
        const show_section = this.state.show_section;
        show_section[section_name] = !this.state.show_section[section_name];
        this.setState({ show_section: show_section });
    }

    setProject(project) {
        if (this.expert_study_mode) {
            if (project.key !== -1) {
                const config = user_study_config[Object.keys(user_study_config)[project.key - 1]];
                this.selectExperiment({ value: config.experiment });
                this.setState({
                    n_episodes: config.n_episodes,
                    project: project.value,
                    reset_state: config.reset_state,
                    request_use_latent_features: config.request_use_latent_features,
                    deterministic_evaluation: config.deterministic_evaluation,
                    request_explainer: config.request_explainer,
                    request_reproject: config.request_reproject,
                    sample_all_checkpoints: config.sample_all_checkpoints,
                    embedding_settings: config.embedding_settings,
                });
                this.props.setSidebarProp({
                    selected_project_id: project.value,
                    n_episodes: config.n_episodes,
                    reset_state: config.reset_state,
                    request_use_latent_features: config.request_use_latent_features,
                    deterministic_evaluation: config.deterministic_evaluation,
                    request_explainer: config.request_explainer,
                    request_reproject: config.request_reproject,
                    sample_all_checkpoints: config.sample_all_checkpoints,
                    embedding_settings: config.embedding_settings,
                });
                //this.setEmbeddingOption({value: config.embedding_method});
                //this.setEmbeddingAxisOptions({value: config.embedding_axis_option});
                this.expSelectRef.current.setValue({
                    label: this.state.experiments.find((exp) => exp.id === config.experiment).exp_name,
                    value: config.experiment,
                });
                //this.setAlgorithmParameter({value: config.embedding_settings});
            }
        } else {
            this.props.setSidebarProp({ selected_project_id: project.value });
        }
    }

    updateExperiments() {
        axios.get('/routing/get_experiments').then((res) => {
            const exps = res.data;
            const callback_frequencies = exps.map((exp) => exp.callback_frequency);
            const exp_ids = [];
            const exp_id_to_idx = {};
            exps.map((exp) => exp.id).forEach((id, i) => {
                exp_ids.push(id);
                exp_id_to_idx[id] = i;
            });
            this.setState({ experiments: exps, experiment_ids: exp_ids, exp_id_to_exp_index: exp_id_to_idx });
        });

        axios.get('/routing/get_environments').then((res) => {
            const envs = res.data;
            this.setState({ environments: envs });
        });

        axios.get('/routing/get_tracking_items').then((res) => {
            this.setState({ tracking_items: new Map(res.data.map((item) => [item.tracking_id, item])) });
        });
    }

    getExperimentOptions() {
        if (this.state.experiments.length == 0) return [];

        const return_array = [];
        this.state.experiments.forEach((experiment, i) =>
            return_array.push({ label: experiment.exp_name, value: experiment.id })
        );

        return return_array;
    }

    toggleEvalWidget() {
        const new_value = !this.state.show_eval_widget;
        this.setState({ show_eval_widget: new_value });
    }

    getEnvironmentOptions() {
        if (this.state.experiments.length == 0 || this.state.environments.length == 0) return [];

        const return_array = [];
        this.state.environments.forEach((env, i) => return_array.push({ label: env.env_name, value: env.id }));

        return return_array;
    }

    getEmbeddingOptions() {
        return this.state.embedding_methods.map((option) => ({ label: option, value: option }));
    }

    setEmbeddingOption(event) {
        const chosen_method = event.value;
        axios.get(`/routing/get_embedding_method_params?embedding_method=${chosen_method}`).then((res) => {
            const params = res.data;
            this.setState({ embedding_settings: params, embedding_method: chosen_method });
            this.props.setSidebarProp({ embedding_settings: params, embedding_method: chosen_method });
        });
    }

    setEmbeddingAxisOptions(event) {
        const chosen_option = event.value;
        this.setState({ embedding_axis_option: chosen_option });
        this.props.setSidebarProp({ embedding_axis_option: chosen_option });
    }

    selectExperiment(event) {
        const selected_experiment = this.state.experiments.find((exp) => exp.id === event.value);
        const selected_env = this.state.environments.find((env) => env.env_name === selected_experiment.environment);
        this.setState(
            {
                selected_experiment: selected_experiment,
                primary_env: selected_env,
                selected_checkpoint_timestep: selected_experiment.num_timesteps,
            },
            function () {
                this.expSelectRef.current.select.setValue({ label: selected_env.env_name, value: selected_env.id });
                this.getCheckpointOptions();
                //this.expSelectRef.current.setValue({label: "finished", value: selected_experiment.num_timesteps })
            }
        );
        this.props.setSidebarProp({
            selected_experiment: selected_experiment,
            primary_env: selected_env,
            selected_checkpoint_timestep: selected_experiment.num_timesteps,
        });
    }

    getCheckpointOptions() {
        if (this.state.selected_experiment === {}) return;
        const callback_freq = this.state.selected_experiment.callback_frequency;
        const n_steps = this.state.selected_experiment.num_timesteps;
        const return_list = [];
        for (let i = 0; i < n_steps; i += callback_freq) {
            return_list.push({ label: i, value: i });
        }
        return_list.push({ label: 'finished', value: n_steps });

        this.setState({ checkpoint_options: return_list });
        this.props.setSidebarProp({ checkpoint_options: return_list });
    }

    selectEvalEnvs(env_type, event) {
        const selected_env = this.state.environments.find((env) => env.id === event.value);
        if (env_type === 'primary') {
            this.setState({ primary_env: selected_env });
            this.props.setSidebarProp({ primary_env: selected_env });
        } else if (env_type === 'secondary') {
            this.setState({ secondary_env: selected_env });
            this.props.setSidebarProp({ secondary_env: selected_env });
        }
    }

    selectCheckpointTimestep(event) {
        const timestep = event.value;
        this.setState({ selected_checkpoint_timestep: timestep });
        this.props.setSidebarProp({ selected_checkpoint_timestep: timestep });
    }

    requestComparison() {
        const collapsed = !this.state.show_compare_envs;
        this.setState({ show_compare_envs: collapsed });
    }

    onRenderCheckbox(event) {
        this.setState({ request_rendering: event.target.checked });
        this.props.setSidebarProp({ request_rendering: event.target.checked });
    }

    onDeterministicEvalCheckbox(event) {
        this.setState({ deterministic_evaluation: event.target.checked });
        this.props.setSidebarProp({ deterministic_evaluation: event.target.checked });
    }

    onSampleAllCheckpointsCheckbox(event) {
        this.setState({ sample_all_checkpoints: event.target.checked });
        this.props.setSidebarProp({ sample_all_checkpoints: event.target.checked });
    }

    onExplainerCheckbox(event) {
        this.setState({ request_explainer: event.target.checked });
        this.props.setSidebarProp({ request_explainer: event.target.checked });
    }

    changeNEpisodes(event) {
        this.setState({ n_episodes: event.target.value });
        this.props.setSidebarProp({ n_episodes: event.target.value });
    }

    onResetStateCheckbox(event) {
        this.setState({ reset_state: event.target.checked });
        this.props.setSidebarProp({ reset_state: event.target.checked });
    }

    onLatentFeaturesCheckbox(event) {
        this.setState({ request_use_latent_features: event.target.checked });
        this.props.setSidebarProp({ request_use_latent_features: event.target.checked });
    }

    onRequestReproject(event) {
        this.setState({ request_reproject: event.target.checked });
        this.props.setSidebarProp({ request_reproject: event.target.checked });
    }

    createInputList(onChange) {
        if (Object.keys(this.state.embedding_settings).length === 0) return;
        const input_list = [];
        const embedding_settings = this.state.embedding_settings;
        const algo_keys = Object.keys(embedding_settings);
        for (const prop_key in algo_keys) {
            if (typeof embedding_settings[algo_keys[prop_key]] == 'boolean') {
                input_list.push(
                    <React.Fragment key={prop_key + 'fragment'}>
                        <Col sm="7">
                            <Form.Label>{algo_keys[prop_key]}</Form.Label>
                        </Col>
                        <Col sm="5">
                            <Form.Control
                                onChange={(event) => onChange(algo_keys[prop_key], event)}
                                as="select"
                                key={prop_key}
                                defaultValue={embedding_settings[algo_keys[prop_key]]}
                            >
                                <option key={prop_key + '_true'} value="true">
                                    true
                                </option>
                                <option key={prop_key + '_false'} value="false">
                                    false
                                </option>
                            </Form.Control>
                        </Col>
                    </React.Fragment>
                );
            } else {
                input_list.push(
                    <React.Fragment key={prop_key + 'fragment'}>
                        <Col sm="7">
                            <Form.Label>{algo_keys[prop_key]}</Form.Label>
                        </Col>
                        <Col sm="5">
                            <Form.Control
                                onChange={(event) => onChange(algo_keys[prop_key], event)}
                                key={prop_key}
                                placeholder={embedding_settings[algo_keys[prop_key]]}
                            />
                        </Col>
                    </React.Fragment>
                );
            }
        }
        return (
            <Form.Group controlId="form_control" as={Row}>
                {input_list}
            </Form.Group>
        );
    }

    setAlgorithmParameter(param, extra) {
        const current_config = this.state.embedding_settings;
        if (!isNaN(extra.target.value)) current_config[param] = Number(extra.target.value);
        else current_config[param] = extra.target.value;
        this.setState({ embedding_settings: current_config });
        this.props.setSidebarProp({ embedding_settings: current_config });
    }

    render() {
        return (
            <Col className="setupstyle.sidebar_column" md={2}>
                <Form className="setupstyle.form_elements">
                    <Select
                        options={Array.from(this.props.projects.values()).map((m) => {
                            return { key: m.id, label: m.project_name };
                        })}
                        placeholder="Select Project..."
                        ref={this.projectSelectRef}
                        onChange={this.setProject.bind(this)}
                    />
                    <Form.Text className="text-muted">
                        The project is preselected.You can change it at any time.
                    </Form.Text>
                    <hr className="setupstyle.filter_header_hr" style={{ marginTop: 0 }} />
                    <Form.Label>Experiment</Form.Label>
                    <div>
                        <Select
                            options={this.getExperimentOptions()}
                            ref={this.expSelectRef}
                            placeholder="Select Experiment..."
                            onChange={this.selectExperiment.bind(this)}
                        />
                        <p className="setupstyle.grey_text">Select an experiment to investigate</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <Button
                            variant="info"
                            style={{ display: 'inline-block', margin: '15 auto' }}
                            disabled={Object.keys(this.state.selected_experiment).length === 0}
                            onClick={() => this.props.onBenchmarkButton(false)}
                        >
                            {' '}
                            Load
                        </Button>
                    </div>
                    <hr className="setupstyle.filter_header_hr" style={{ marginTop: 0 }} />
                    <Form.Label>
                        Benchmark Agent
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'benchmark')} />
                    </Form.Label>
                    <Collapse in={this.state.show_section.benchmark}>
                        <div>
                            <Model_Tracker
                                benchmarkedModels={this.props.benchmarkedModels}
                                deleteModel={this.props.deleteModel}
                            />
                            <FormControl
                                name="n_episodes"
                                placeholder="Episodes"
                                key="n_episodes"
                                onChange={this.changeNEpisodes.bind(this)}
                            />
                            <p className="setupstyle.grey_text">How many episodes to collect during benchmarking</p>
                            <Button
                                variant="info"
                                disabled={Object.keys(this.state.selected_experiment).length === 0}
                                onClick={() => this.props.onBenchmarkButton(false)}
                            >
                                {' '}
                                New Benchmark
                            </Button>
                            <Button
                                variant="success"
                                style={{ marginLeft: '10px' }}
                                disabled={Object.keys(this.state.selected_experiment).length === 0}
                                onClick={() => this.props.onBenchmarkButton(true)}
                            >
                                <FontAwesomeIcon icon={faPlus} /> Add to Current
                            </Button>
                            <p className="setupstyle.grey_text">
                                Either start a new environment benchmark, or add to the existing runs (for common
                                embedding).
                            </p>
                            <Form.Check type="checkbox">
                                <Form.Check.Input
                                    checked={this.state.request_rendering}
                                    onChange={this.onRenderCheckbox.bind(this)}
                                />
                                <Form.Check.Label className="text-muted">Show Env. Rendering</Form.Check.Label>
                            </Form.Check>
                            <Form.Check type="checkbox">
                                <Form.Check.Input
                                    checked={this.state.sample_all_checkpoints}
                                    onChange={this.onSampleAllCheckpointsCheckbox.bind(this)}
                                />
                                <Form.Check.Label className="text-muted">Sample For Each Checkpoint</Form.Check.Label>
                            </Form.Check>
                            <Form.Check type="checkbox">
                                <Form.Check.Input
                                    checked={this.state.deterministic_evaluation}
                                    onChange={this.onDeterministicEvalCheckbox.bind(this)}
                                />
                                <Form.Check.Label className="text-muted">Deterministic Evalution</Form.Check.Label>
                            </Form.Check>
                            <Form.Check type="checkbox">
                                <Form.Check.Input
                                    defaultChecked={this.state.reset_state}
                                    onChange={this.onResetStateCheckbox.bind(this)}
                                />
                                <Form.Check.Label className="text-muted">
                                    Reset State after Episode End (for common trajectories)
                                </Form.Check.Label>
                            </Form.Check>
                            <Form.Check type="checkbox">
                                <Form.Check.Input
                                    defaultChecked={this.state.request_explainer}
                                    onChange={this.onExplainerCheckbox.bind(this)}
                                />
                                <Form.Check.Label className="text-muted">Run Attribution Method</Form.Check.Label>
                            </Form.Check>
                            <Button
                                variant="info"
                                style={{ display: 'inline-block', margin: '15 auto' }}
                                disabled={Object.keys(this.state.selected_experiment).length === 0}
                                onClick={this.props.saveToFile}
                            >
                                {' '}
                                Save current to file
                            </Button>
                            <p className="setupstyle.grey_text">
                                Saving results to file make repeated analysis much faster (Be aware that these files can
                                take up multiple GB!)
                            </p>
                        </div>
                    </Collapse>
                    <hr className="setupstyle.filter_header_hr" style={{ marginTop: 0 }} />
                    <Form.Label>
                        Model Checkpoint
                        <FontAwesomeIcon
                            icon={faCaretDown}
                            onClick={this.toggleSection.bind(this, 'checkpoint_selection')}
                        />
                    </Form.Label>
                    <Collapse in={this.state.show_section.checkpoint_selection}>
                        <div>
                            <div>
                                <Select
                                    isDisabled={Object.keys(this.state.selected_experiment).length === 0 ? true : false}
                                    onChange={this.selectCheckpointTimestep.bind(this)}
                                    options={this.state.checkpoint_options}
                                    ref={this.checkpointSelectRef}
                                    placeholder="Experiment Checkpoints"
                                />
                                <p className="setupstyle.grey_text">Checkpoint for Model and Steps</p>
                            </div>
                            <div>
                                <Select
                                    isDisabled={Object.keys(this.state.selected_experiment).length === 0 ? true : false}
                                    options={this.getEnvironmentOptions()}
                                    onChange={this.selectEvalEnvs.bind(this, 'primary')}
                                    ref={this.envSelectRef}
                                    placeholder="Training Experiment Environment"
                                />
                                <p className="setupstyle.grey_text">Default: Env used for training if registered</p>
                            </div>
                        </div>
                    </Collapse>
                    <hr className="setupstyle.filter_header_hr" style={{ marginTop: 0 }} />
                    <Form.Label>
                        Embedding Controls
                        <FontAwesomeIcon
                            icon={faCaretDown}
                            onClick={this.toggleSection.bind(this, 'embedding_controls')}
                        />
                    </Form.Label>
                    <Collapse in={this.state.show_section.embedding_controls}>
                        <div>
                            <Select
                                name="emb_select"
                                options={this.getEmbeddingOptions()}
                                placeholder="Select Embedding Method..."
                                onChange={this.setEmbeddingOption.bind(this)}
                            />
                            <p className="setupstyle.grey_text">Default: UMAP+Densemap</p>
                            <Form.Text className="text-muted">
                                Reload the embedding with updated settings via the button in the right-hand side info
                                box.
                            </Form.Text>
                            <Select
                                name="emb_type_select"
                                options={[
                                    { value: '2d_embedding', label: '2D embedding' },
                                    { value: '1d_embedding_time', label: '1D embedding + Time' },
                                    { value: '1d_embedding_custom', label: '1D embedding + custom axis' },
                                ]}
                                placeholder="Axis Display Options..."
                                defaultValue={{ value: '2d_embedding', label: '2D embedding' }}
                                onChange={this.setEmbeddingAxisOptions.bind(this)}
                            />
                            <p className="setupstyle.grey_text">Semantic Axis Select. Default: 2D embedding</p>
                            <Select
                                name="emb_axis_select"
                                isDisabled={this.state.embedding_axis_option !== '1d_embedding_custom'}
                                options={[{ value: 'x_position', label: 'X position of Paddle' }]}
                                placeholder="Choose Custom Axis (if available)..."
                                onChange={this.setEmbeddingAxisOptions.bind(this)}
                            />
                            <Form.Check type="checkbox">
                                <Form.Check.Input
                                    defaultChecked={this.state.request_use_latent_features}
                                    onChange={this.onLatentFeaturesCheckbox.bind(this)}
                                />
                                <Form.Check.Label className="text-muted">
                                    Use Latent Features for Embedding
                                </Form.Check.Label>
                            </Form.Check>
                            <Form.Check type="checkbox">
                                <Form.Check.Input
                                    defaultChecked={this.state.request_reproject}
                                    onChange={this.onRequestReproject.bind(this)}
                                />
                                <Form.Check.Label className="text-muted">
                                    Reproject Latent Features with current selected model (feature.extr.)
                                </Form.Check.Label>
                            </Form.Check>
                        </div>
                    </Collapse>
                    <hr className="setupstyle.filter_header_hr" style={{ marginTop: 0 }} />
                    <Form.Label>
                        Embedding Settings
                        <FontAwesomeIcon
                            icon={faCaretDown}
                            onClick={this.toggleSection.bind(this, 'embedding_detail_settings')}
                        />
                    </Form.Label>
                    <Collapse in={this.state.show_section.embedding_detail_settings}>
                        <div>
                            <Form.Group as={Row} className="setupstyle.custom_value_column">
                                {this.createInputList(this.setAlgorithmParameter.bind(this))}
                            </Form.Group>
                        </div>
                    </Collapse>
                </Form>
            </Col>
        );
    }
}

/*
<hr className="setupstyle.filter_header_hr" style={{ marginTop: 0 }} />
<Form.Label>Validation Environment<FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'validation')}/></Form.Label>
<Collapse in={this.state.show_section.validation}>
    <div>
        <div>
            <Select
                options={this.getEnvironmentOptions()}
                isDisabled={(Object.keys(this.state.selected_experiment).length === 0) ? true : false}
                onChange={this.selectEvalEnvs.bind(this, 'secondary')}
                placeholder="Choose Validation Environment..." />
            <p className="setupstyle.grey_text">If available: Choose a second env for testing</p>
        </div>
        <div>
            <Button variant="outline-secondary"
                disabled={this.state.primary_env === undefined || this.state.secondary_env === undefined}
                onClick={this.requestComparison.bind(this)}>Compare Env.</Button>
        </div>
    </div>
</Collapse>
*/
