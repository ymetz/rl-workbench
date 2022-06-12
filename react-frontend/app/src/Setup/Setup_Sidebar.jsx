import React, { Component } from 'react';
import axios from 'axios';
import { Form, FormControl, Col, Button, Collapse } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import Provenance_Tracker from '../Common/Provenance_Tracker';
import bsCustomFileInput from 'bs-custom-file-input';

const splitFunction = (list) => {
    if (list === '[]') return '';
    const return_list = list.replace(/^\[+|\]+$/g, '').split(',');
    return return_list.map((e) => e.trim());
};

export default class setup_sidebar extends Component {
    constructor(props) {
        super(props);
        this.projectSelectRef = React.createRef();

        this.state = {
            environments: [],
            selected_env: { name: '', id: undefined, has_state_loading: false },
            dataset_path: '',
            sample_episodes: 5,
            request_rendering: true,
            dataset_sample_size: 50,
            steps_per_sample: 360,
            reset_state: false,
            random_seed: 0,
            show_section: {
                tracker: true,
                benchmark: true,
                dataset: true,
            },
        };
    }

    componentDidMount() {
        axios.get('/routing/get_environments').then((res) => {
            const envs = res.data;
            this.setState({ environments: envs });
        });

        bsCustomFileInput.init();
    }

    toggleSection(section_name) {
        const show_section = this.state.show_section;
        show_section[section_name] = !this.state.show_section[section_name];
        this.setState({ show_section: show_section });
    }

    getEnvironmentOptions() {
        const selected_project = this.props.projects.get(this.props.selectedProject);
        const return_options = [];
        if (selected_project) {
            this.state.environments
                .filter((m) => splitFunction(selected_project.project_environments).includes(m.env_name))
                .forEach((environment) => {
                    return_options.push({ label: environment.env_name, value: environment.id });
                });
        }
        return return_options;
    }

    getDatasetOptions() {
        const selected_project = this.props.projects.get(this.props.selectedProject);
        const return_options = [];
        if (selected_project && selected_project.project_datasets !== '[]') {
            splitFunction(selected_project.project_datasets).forEach((dataset) => {
                return_options.push({ label: dataset, value: dataset });
            });
        }
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

    setBenchmarkSteps(event) {
        let new_sample_episodes = 5; // set to default value
        if (event.target.value != '') {
            new_sample_episodes = Number(event.target.value);
        }
        this.setState({ sample_episodes: new_sample_episodes });
        this.props.setSidebarProp({ sample_episodes: new_sample_episodes });
    }

    setDatasetPath(event) {
        console.log(event);
        // const new_ds_path = event.target.files[0].name;
        const new_ds_path = event.value + '.npz';
        let ds_activated = false;
        if (new_ds_path !== '') ds_activated = true;
        this.setState({ dataset_path: new_ds_path });
        this.props.setSidebarProp({ dataset_path: new_ds_path });
    }

    onRenderCheckbox(event) {
        this.setState({ request_rendering: event.target.checked });
        this.props.setSidebarProp({ request_rendering: event.target.checked });
    }

    onResetStateCheckbox(event) {
        this.setState({ reset_state: event.target.checked });
        this.props.setSidebarProp({ reset_state: event.target.checked });
    }

    setDatasetSampleSize(event) {
        const new_val = Number(event.target.value);
        this.setState({ dataset_sample_size: new_val });
        this.props.setSidebarProp({ dataset_sample_size: new_val });
    }

    onObsStateCheckbox() {
        this.setState({ interpret_obs_as_state: event.target.checked });
        this.props.setSidebarProp({ interpret_obs_as_state: event.target.checked });
    }

    setStepsPerSample(event) {
        const new_val = Number(event.target.value);
        this.setState({ steps_per_sample: new_val });
        this.props.setSidebarProp({ steps_per_sample: new_val });
    }

    render() {
        if (this.props.projects.has(this.props.selectedProject)) {
            const selected_project = this.props.projects.get(this.props.selectedProject);
            this.projectSelectRef.current.select.setValue({
                label: selected_project.project_name,
                value: selected_project.id,
            });
        }
        return (
            <Col className="setupstyle.sidebar_column" md={2}>
                <Form className="setupstyle.form_elements">
                    <Select
                        options={Array.from(this.props.projects.values()).map((m) => {
                            return { key: m.id, label: m.project_name };
                        })}
                        placeholder="Select Project..."
                        ref={this.projectSelectRef}
                        onChange={this.props.setProject}
                    />
                    <Form.Text className="text-muted">
                        The project is preselected. You can change it at any time.
                    </Form.Text>
                    <hr />
                    <Form.Label>
                        {this.props.mode == 'environment' ? 'Environment' : 'Dataset'}
                        <FontAwesomeIcon icon={faCaretDown} onClick={this.toggleSection.bind(this, 'benchmark')} />
                    </Form.Label>
                    {this.props.mode === 'environment' ? (
                        <Collapse in={this.state.show_section.benchmark}>
                            <div>
                                <Select
                                    name="env_select"
                                    options={this.getEnvironmentOptions()}
                                    placeholder="Select Environment..."
                                    onChange={this.setSelectedEnv.bind(this)}
                                />
                                <Form.Label className="setupstyle.grey_text">Number of Sampled Episodes</Form.Label>
                                <FormControl
                                    name="sample_episodes"
                                    placeholder={this.state.sample_episodes}
                                    key="sample_episodes"
                                    onChange={this.setBenchmarkSteps.bind(this)}
                                />
                                <Form.Check type="checkbox">
                                    <Form.Check.Input
                                        checked={this.state.request_rendering}
                                        onChange={this.onRenderCheckbox.bind(this)}
                                    />
                                    <Form.Check.Label className="text-muted">Show Env. Rendering</Form.Check.Label>
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
                                <Button
                                    className="setupstyle.benchmark_button"
                                    variant="outline-info"
                                    onClick={this.props.onBenchmarkButton}
                                    disabled={this.state.selected_env.name === ''}
                                >
                                    Test Environment (Random)
                                </Button>
                                <Form.Text className="text-muted">
                                    Test the selected environment via random action selection
                                </Form.Text>
                            </div>
                        </Collapse>
                    ) : (
                        <Collapse in={this.state.show_section.dataset}>
                            <div>
                                <Form.Group>
                                    <Form.Label>Dataset</Form.Label>
                                    <Select
                                        name="env_select"
                                        options={this.getDatasetOptions()}
                                        placeholder="Select Environment..."
                                        onChange={this.setDatasetPath.bind(this)}
                                    />
                                    <Form.Text className="text-muted">
                                        (Optional) Provide a path to the .npz file which contains the dataset for
                                        pre-training or imitation learning
                                    </Form.Text>
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label>Corresponding Environment</Form.Label>
                                    <Select
                                        name="env_select"
                                        options={this.getEnvironmentOptions()}
                                        placeholder="Select Environment..."
                                        onChange={this.setSelectedEnv.bind(this)}
                                    />
                                    <Form.Text className="text-muted">
                                        Choose a corresponding environment for the dataset.
                                    </Form.Text>
                                    <Form.Check type="checkbox">
                                        <Form.Check.Input
                                            defaultChecked={this.state.request_rendering}
                                            onChange={this.onRenderCheckbox.bind(this)}
                                        />
                                        <Form.Check.Label className="text-muted">
                                            Custom Env. Rendering
                                        </Form.Check.Label>
                                    </Form.Check>
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label>Dataset Sample Size</Form.Label>
                                    <Form.Control
                                        name="dataset_sample_size"
                                        placeholder={this.state.dataset_sample_size}
                                        key="dataset_sample_size"
                                        onChange={this.setDatasetSampleSize.bind(this)}
                                    />
                                    <Form.Text className="text-muted">
                                        If the value is bigger than the dataset size, the whole dataset is returned.
                                    </Form.Text>
                                    <Form.Label>Steps per Sample</Form.Label>
                                    <Form.Control
                                        name="steps_per_sample"
                                        placeholder={this.state.steps_per_sample}
                                        key="steps_per_sample"
                                        onChange={this.setStepsPerSample.bind(this)}
                                    />
                                </Form.Group>
                                <Button
                                    className="setupstyle.benchmark_button"
                                    variant="outline-info"
                                    onClick={this.props.onBenchmarkButton}
                                    disabled={this.state.selected_env.name === ''}
                                >
                                    Load Dataset
                                </Button>
                                <Form.Text className="text-muted">
                                    Load the dataset with the specified parameteres
                                </Form.Text>
                            </div>
                        </Collapse>
                    )}
                    <hr />
                    <Form.Label>
                        Provenance Tracker
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
                </Form>
            </Col>
        );
    }
}

/*
<Form.Label>Perplexity</Form.Label>
                                    <Form.Control
                                        name="perplexity"
                                        placeholder={this.state.tsne_perplexity}
                                        key="perplexity"
                                        onChange={null} />
                                    <Form.Label>Sequence Length {this.state.tsne_sequence_length}</Form.Label>
                                    <Form.Control type="range" min="1" max="10" value={this.state.tsne_sequence_length} id="sequence_length_range" onChange={null} />
                                    <Form.Text className="text-muted">Stack multiple steps for clustering</Form.Text>
                                    */
