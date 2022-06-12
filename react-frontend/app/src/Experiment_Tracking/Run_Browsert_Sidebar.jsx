import React, { Component } from 'react';
import axios from 'axios';
import { Form, FormControl, Row, Col, Button, Collapse, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Provenance_Tracker from '../Common/Provenance_Tracker';
import bsCustomFileInput from 'bs-custom-file-input';

export default class rubrowser_sidebar extends Component {
    constructor(props) {
        super(props);
        this.experimentSelectRef = React.createRef();

        this.state = {
            experiments: [],
            experiment_ids: [],
            default_experiment: {},
            current_exp_name: '',
            current_working_exp: {},
            frameworks: [],
            selected_framework: null,
            algorithms: {},
            selected_algorithm: '',
            selected_policy: 'MlpPolicy',
            environments: [],
            selected_env: { name: '', id: undefined, has_state_loading: false },
            dataset_path: '',
            random_seed: 0,
            show_section: {
                name_search: true,
                tracker: false,
                algorithm: true,
                dataset: false,
                hyperparams: false,
                training: false,
            },
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

        bsCustomFileInput.init();
    }

    toggleSection(section_name) {
        const show_section = this.state.show_section;
        show_section[section_name] = !this.state.show_section[section_name];
        this.setState({ show_section: show_section });
    }

    setSelectedExperiment(event) {
        if (event === null || event === undefined) {
            this.setState({ current_working_exp: {} });
            return;
        }
        const exp_name = event.label;
        const current_framework = this.state.selected_framework;
        const working_exp = this.state.experiments.find((exp) => exp.exp_name === exp_name);
        working_exp.setup_config =
            this.state.algorithms[current_framework][this.state.selected_algorithm]['setup_config'];
        this.setState({ current_exp_name: exp_name, current_working_exp: working_exp });
        this.props.setSidebarProp({ current_exp_name: exp_name });
    }

    getExperimentOptions() {
        if (this.state.experiments.length == 0) return [];
        return this.state.experiments.map((experiment, i) => {
            return { label: experiment.exp_name, value: 'exp' + i, key: experiment.exp_name };
        });
    }

    onCreateExperiment(event) {
        let new_exp;
        if (this.state.experiments.length > 0) new_exp = Object.assign({}, this.state.experiments[0]);
        else new_exp = Object.assign({}, this.state.default_experiment);
        new_exp.exp_name = event;
        new_exp.id = this.state.experiments.length; // internal menu id =/= database experiment id
        new_exp.framework = this.state.selected_framework;
        new_exp.algorithm = this.state.selected_algorithm;
        const exp_list = this.state.experiments;
        exp_list.push(new_exp);
        console.log('questionmark00');
        this.setState({ current_exp_name: event, current_working_exp: new_exp, experiments: exp_list });
    }

    submitExperiment() {
        const submit_experiment = this.state.current_working_exp;
        submit_experiment.environment = this.state.selected_env.name;
        submit_experiment.environment_id = this.state.selected_env.id;
        submit_experiment.algorithm = this.state.selected_algorithm;
        submit_experiment.framework = this.state.selected_framework;
        submit_experiment.obs_space_info = this.props.currentSpaceInfo.obs_space;
        submit_experiment.action_space_info = this.props.currentSpaceInfo.action_space;
        submit_experiment.setup_config['policy'] = this.state.selected_policy;
        submit_experiment.setup_config['frame_stack'] = 0;
        submit_experiment.setup_config['normalize'] = 0;
        submit_experiment.dataset_path = this.state.dataset_path;
        axios.post('/routing/init_training?name=' + this.state.current_exp_name, submit_experiment).then((res) => {
            console.log('submitted experiment');
        });
    }

    getAlgorithmOptions() {
        const current_framework = this.state.selected_framework;
        if (Object.keys(this.state.algorithms).length === 0) return [];
        return Object.keys(this.state.algorithms[current_framework]).map((algorithm) => (
            <option key={'algo_option_' + algorithm}>{algorithm}</option>
        ));
    }

    setSelectedAlgorithm(event) {
        if (Object.keys(this.state.current_working_exp).length === 0) return;
        const current_framework = this.state.selected_framework;
        const new_algorithm = event.target.value;
        const working_exp = this.state.current_working_exp;
        working_exp.algorithm = new_algorithm;
        working_exp.framework = current_framework;
        working_exp.setup_config = this.state.algorithms[current_framework][new_algorithm]['setup_config'];
        this.setState({
            selected_algorithm: new_algorithm,
            current_working_exp: working_exp,
        });
        console.log(new_algorithm);
        this.props.setSidebarProp({ selected_algorithm: new_algorithm });
    }

    getFrameworkOptions() {
        const return_options = [];
        this.state.frameworks.forEach((framework) => {
            return_options.push(<option key={'algo_option_' + framework}>{framework}</option>);
        });
        return return_options;
    }

    setSelectedFramework(event) {
        const new_framework = event.target.value;
        this.setState({ selected_framework: new_framework }, () => {
            const new_algorithm = Object.keys(this.state.algorithms[new_framework])[0];
            const working_exp = this.state.current_working_exp;
            working_exp.algorithm = new_algorithm;
            working_exp.framework = new_framework;
            working_exp.setup_config = this.state.algorithms[new_framework][new_algorithm]['setup_config'];
            this.setState({ selected_algorithm: new_algorithm, current_working_exp: working_exp });
            this.props.setSidebarProp({ selected_algorithm: new_algorithm });
        });
    }

    getEnvironmentOptions() {
        const return_options = [];
        this.state.environments.forEach((environment) => {
            return_options.push({ label: environment.env_name, value: environment.id });
        });
        return return_options;
    }

    setSelectedEnv(event) {
        const new_env_id = Number(event.value);
        const new_env = this.state.environments.find((env) => env.id === new_env_id);
        this.setState({
            selected_env: { name: new_env.env_name, id: new_env.id, has_state_loading: new_env.has_state_loading },
        });
        this.props.setSidebarProp({
            selected_env: { name: new_env.env_name, id: new_env.id, has_state_loading: new_env.has_state_loading },
        });
    }

    setDatasetPath(event) {
        // const new_ds_path = event.target.files[0].name;
        const new_ds_path = event.target.value + '.npz';
        let ds_activated = false;
        if (new_ds_path !== '') ds_activated = true;
        this.setState({ dataset_path: new_ds_path });
        this.props.setSidebarProp({ dataset_path: new_ds_path });
    }

    setPolicyProps(event) {
        this.setState({ selected_policy: event.target.value });
    }

    setTrainingProps(event) {
        const new_val = Number(event.target.value);
        const current_working_exp = this.state.current_working_exp;
        current_working_exp[event.target.name] = new_val;
        this.setState({ current_working_exp: current_working_exp });
    }

    createInputList(onChange) {
        if (Object.keys(this.state.current_working_exp).length === 0) return;
        const input_list = [];
        const setup_config = this.state.current_working_exp.setup_config;
        const current_framework = this.state.current_working_exp.framework;
        const current_algorithm = this.state.current_working_exp.algorithm;
        const param_dosctring = this.state.algorithms[current_framework][current_algorithm]['param_docstring'];
        const algo_keys = Object.keys(setup_config);
        for (const prop_key in algo_keys) {
            if (typeof setup_config[algo_keys[prop_key]] == 'boolean') {
                input_list.push(
                    <React.Fragment key={prop_key + 'fragment'}>
                        <Col sm="7">
                            <OverlayTrigger
                                placement="top"
                                trigger="click"
                                overlay={(props) => (
                                    <Tooltip id={prop_key + 'tooltip'} {...props}>
                                        {param_dosctring[algo_keys[prop_key]]}
                                    </Tooltip>
                                )}
                            >
                                <Form.Label>{algo_keys[prop_key]}</Form.Label>
                            </OverlayTrigger>
                        </Col>
                        <Col sm="5">
                            <Form.Control
                                onChange={(event) => onChange(algo_keys[prop_key], event)}
                                as="select"
                                key={prop_key}
                                defaultValue={setup_config[algo_keys[prop_key]]}
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
                        {' '}
                        <Col sm="7">
                            <OverlayTrigger
                                placement="top"
                                trigger="click"
                                overlay={(props) => (
                                    <Tooltip id={prop_key + 'tooltip'} {...props}>
                                        {param_dosctring[algo_keys[prop_key]]}
                                    </Tooltip>
                                )}
                            >
                                <Form.Label>{algo_keys[prop_key]}</Form.Label>
                            </OverlayTrigger>
                        </Col>
                        <Col sm="5">
                            <Form.Control
                                onChange={(event) => onChange(algo_keys[prop_key], event)}
                                key={prop_key}
                                placeholder={setup_config[algo_keys[prop_key]]}
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
        const current_exp = this.state.current_working_exp;
        if (!isNaN(extra.target.value)) current_exp.setup_config[param] = Number(extra.target.value);
        else current_exp.setup_config[param] = extra.target.value;
        this.setState({ current_working_exp: current_exp });
    }

    render() {
        return (
            <Col className="setupstyle.sidebar_column" md={2}>
                <hr className="setupstyle.filter_header_hr" style={{ marginBottom: 0, marginTop: 0 }} />
                <div className="setupstyle.filter_header_div">
                    <Form.Label className="setupstyle.filter_header">
                        <b>Experiment Setup</b>
                    </Form.Label>
                </div>
                <hr className="setupstyle.filter_header_hr" style={{ marginTop: 0 }} />
                <div className="setupstyle.center_button_div">
                    <Button variant="secondary" onClick={this.props.toggleTrainingModel}>
                        Training Setup
                    </Button>
                    <Form.Text className="text-muted">Setup and start new training runs</Form.Text>
                </div>
                <hr className="setupstyle.filter_header_hr" style={{ marginBottom: 0 }} />
                <Form className="setupstyle.form_elements">
                    <div className="setupstyle.filter_header_div">
                        <Form.Label className="setupstyle.filter_header">
                            <b>Filtering Options</b>
                        </Form.Label>
                    </div>
                    <hr className="setupstyle.filter_header_hr" style={{ marginTop: 0 }} />
                    <Form.Label>
                        Search
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'name_search')} />
                    </Form.Label>
                    <Collapse in={this.state.show_section.name_search}>
                        <div>
                            <CreatableSelect
                                isClearable
                                options={this.getExperimentOptions()}
                                placeholder="Select Experiment..."
                                ref={this.experimentSelectRef}
                                onChange={this.setSelectedExperiment.bind(this)}
                                onCreateOption={this.onCreateExperiment.bind(this)}
                            />
                            <Form.Text className="text-muted">Select an existing experiment</Form.Text>
                        </div>
                    </Collapse>
                    <hr />
                    <Form.Label>
                        Test Case Tracker
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'tracker')} />
                    </Form.Label>
                    <Collapse in={this.state.show_section.tracker}>
                        <div>
                            <Provenance_Tracker
                                buttonEnabled={
                                    this.state.current_exp_name !== '' && this.state.selected_env.id !== undefined
                                }
                                trackingItems={this.props.trackingItems}
                                addTrackingItem={this.props.addCurrentSelection}
                                deleteTrackingItem={this.props.deleteTrackingItem}
                            />
                        </div>
                    </Collapse>
                    <hr />
                    <Form.Label>
                        Environment
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'benchmark')} />
                    </Form.Label>
                    <Collapse in={this.state.show_section.benchmark}>
                        <div>
                            <Select
                                name="env_select"
                                options={this.getEnvironmentOptions()}
                                placeholder="Select Environment..."
                                onChange={this.setSelectedEnv.bind(this)}
                            />
                            <Form.Text className="text-muted">Select a registered environment</Form.Text>
                        </div>
                    </Collapse>
                    <hr />
                    <Form.Label>
                        Dataset
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'dataset')} />
                    </Form.Label>
                    <Collapse in={this.state.show_section.dataset}>
                        <div>
                            <FormControl
                                as="select"
                                name="dataset_select"
                                placeholder="Dataset"
                                defaultValue={this.state.dataset_path}
                                onChange={this.setDatasetPath.bind(this)}
                            >
                                <option key={''}>---</option>
                                <option key={'BASELINE_DATA'}>BASELINE_DATA</option>
                                <option key={'NOSTACKING_DATA'}>NOSTACKING_DATA</option>
                                <option key={'STACKING_DATA'}>STACKING_DATA</option>
                                <option key={'TRANSFORMER_DATA'}>TRANSFORMER_DATA</option>
                                <option key={'WITHPOSDATA'}>WITHPOSDATA</option>
                            </FormControl>
                            <Form.Text className="text-muted">
                                (Optional) Provide a path to the .npz file which contains the dataset for pre-training
                                or imitation learning
                            </Form.Text>
                        </div>
                    </Collapse>
                    <hr />
                    <Form.Label>
                        Algorithm
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'algorithm')} />
                    </Form.Label>
                    <Collapse in={this.state.show_section.algorithm}>
                        <div>
                            <Form.Label className="setupstyle.grey_text">Frameworks</Form.Label>
                            <FormControl
                                as="select"
                                name="framework_select"
                                placeholder="Framework"
                                defaultValue={this.state.selected_framework}
                                onChange={this.setSelectedFramework.bind(this)}
                            >
                                {this.getFrameworkOptions()}
                            </FormControl>
                            <Form.Label className="setupstyle.grey_text">Algorithm</Form.Label>
                            <FormControl
                                as="select"
                                name="algorithm_select"
                                placeholder="Algorithm"
                                defaultValue={this.state.selected_algorithm}
                                onChange={this.setSelectedAlgorithm.bind(this)}
                            >
                                {this.getAlgorithmOptions()}
                            </FormControl>
                        </div>
                    </Collapse>
                    <hr />
                    <Form.Label>
                        Policy
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'policy')} />
                    </Form.Label>
                    <Collapse in={this.state.show_section.policy}>
                        <div>
                            <Form.Group>
                                <Form.Label className="setupstyle.grey_text">Policy Name</Form.Label>
                                <Form.Control
                                    placeholder="MlpPolicy"
                                    key="policy_input"
                                    name="policy"
                                    onChange={this.setPolicyProps.bind(this)}
                                ></Form.Control>
                                <Form.Text className="text-muted">
                                    Choose a registered policy. Policy should fit the format of the observation space.
                                </Form.Text>
                                <Form.Label className="setupstyle.grey_text">Policy paramters/kwargs</Form.Label>
                                <Form.Control
                                    placeholder=""
                                    key="policy_kwargs"
                                    name="policy_kwargs"
                                    onChange={this.setPolicyProps.bind(this)}
                                ></Form.Control>
                            </Form.Group>
                        </div>
                    </Collapse>
                    <hr />
                    <Form.Label>
                        Algorithm Parameters
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'hyperparams')} />
                    </Form.Label>
                    <Collapse in={this.state.show_section.hyperparams}>
                        <div>
                            <Form.Text className="text-muted">
                                Select an experiment to view algorith paremeters. Hover over paramater to read the
                                docstring.
                            </Form.Text>
                            <Form.Group as={Row} className="setupstyle.custom_value_column">
                                {this.createInputList(this.setAlgorithmParameter.bind(this))}
                            </Form.Group>
                        </div>
                    </Collapse>
                    <Form.Label>
                        Training Settings
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'training')} />
                    </Form.Label>
                    <Collapse in={this.state.show_section.hyperparams}>
                        <div>
                            <Form.Text className="text-muted">
                                Select an experiment to view algorith paremeters. Hover over paramater to read the
                                docstring.
                            </Form.Text>
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
