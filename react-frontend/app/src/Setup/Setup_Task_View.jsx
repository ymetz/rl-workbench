import React, { Component } from 'react';
import { Form, Row, Col, Figure, Badge } from 'react-bootstrap';
import '../css/Setup.module.css';
import CreatableSelect from 'react-select/creatable';

const tagFormater = (list) => {
    if (list === '[]') return '';
    const tag_list = list.replace(/^\[+|\]+$/g, '').split(',');
    const return_list = tag_list.map((tag) => {
        return (
            <Badge key={tag} className="pill" pill variant="secondary">
                {tag}
            </Badge>
        );
    });
    return <div>{return_list}</div>;
};

const lineFormater = (list) => {
    if (list === '[]') return '';
    const return_list = list.replace(/^\[+|\]+$/g, '').split(',');
    return return_list + ' (' + return_list.length + ')';
};

/**
 * Main component of the setup page. No shared state to other parts of the application.
 * Contains references to all submodules such as the sidebar, env and space widgets,
 * reward timeline and player etc. Contains most data handling functions,
 * i.e. button callbacks, data loading from server.
 */
export default class setup_main extends Component {
    constructor(props) {
        super(props);
        this.taskSelectRef = React.createRef();

        this.state = {
            selected_project_id: 0,
            in_edit_mode: false,
        };
    }

    onCreateTask(event) {
        const new_exp_name = event;
    }

    render() {
        return (
            <Row className="justify-content-md-center" style={{ overflowY: 'scroll', height: '85%' }}>
                <Col md={6} className="my-auto">
                    <Row className="justify-content-md-center">
                        <Col md={6}>
                            <h2>Project Selection</h2>
                            <p>
                                Create* a new project or browse existing ones.
                                <br />
                            </p>
                            <p className="text-muted">
                                A project can correspond to a specific use case or a line of experiments. For each
                                project, you can add multiple simulation environments, datasets, experiment runs etc.
                                <br />
                            </p>
                            <CreatableSelect
                                isClearable
                                options={Array.from(this.props.projects.values()).map((m) => {
                                    return { key: m.id, label: m.project_name };
                                })}
                                placeholder="Select Or Create New Task..."
                                ref={this.taskSelectRef}
                                onChange={this.props.setProject}
                                onCreateOption={this.onCreateTask.bind(this)}
                            />
                            <br />
                            <p className="text-muted">
                                * For the public web demo, creation of new projects is disabled.
                            </p>
                        </Col>
                    </Row>
                </Col>
                <Col md={6}>
                    {this.state.in_edit_mode ? (
                        <Row>
                            <Form.Group>
                                <Form.Label>Task</Form.Label>
                                <Form.Text className="text-muted">Create or select a task.</Form.Text>
                                <Form.Check type="checkbox">
                                    <Form.Check.Input onChange={null} />
                                    <Form.Check.Label className="text-muted">
                                        The env. observations can be interpreted as the state. Allows custom rendering.
                                    </Form.Check.Label>
                                </Form.Check>
                                <Form.Label>Steps per Sample</Form.Label>
                                <Form.Control
                                    name="steps_per_sample"
                                    placeholder={'this.state.steps_per_sample'}
                                    key="steps_per_sample"
                                    onChange={null}
                                />
                                <Form.Text className="text-muted">Stack multiple steps for clustering</Form.Text>
                            </Form.Group>
                        </Row>
                    ) : (
                        <Row style={{ paddingTop: '50px' }}>
                            <Col>
                                <Row>
                                    <Figure>
                                        <Figure.Image
                                            src={
                                                this.props.projects.has(this.props.selectedProject)
                                                    ? '/public/images/thumbnail_project_' +
                                                      this.props.selectedProject +
                                                      '.PNG'
                                                    : '/public/images/thumbnail_project_default.PNG'
                                            }
                                            thumbnail
                                        />
                                    </Figure>
                                </Row>
                                <Row>
                                    <div>
                                        <h4>
                                            Project Name:{' '}
                                            {this.props.projects.has(this.props.selectedProject)
                                                ? this.props.projects.get(this.props.selectedProject).project_name
                                                : '-'}
                                        </h4>
                                        <hr />
                                        <p>
                                            <b>Description: </b>
                                        </p>
                                        <p>
                                            {this.props.projects.has(this.props.selectedProject)
                                                ? this.props.projects.get(this.props.selectedProject)
                                                      .project_description
                                                : '-'}{' '}
                                        </p>
                                        <p>
                                            <b>Tags: </b>
                                        </p>
                                        <p>
                                            {this.props.projects.has(this.props.selectedProject)
                                                ? tagFormater(
                                                      this.props.projects.get(this.props.selectedProject).project_tags
                                                  )
                                                : '-'}{' '}
                                        </p>
                                        <hr />
                                        <p>
                                            <b>Selected Environments: </b>
                                        </p>
                                        <p>
                                            {this.props.projects.has(this.props.selectedProject)
                                                ? lineFormater(
                                                      this.props.projects.get(this.props.selectedProject)
                                                          .project_environments
                                                  )
                                                : '-'}
                                        </p>
                                        <p>
                                            <b>Selected Datasets: </b>
                                        </p>
                                        <p>
                                            {this.props.projects.has(this.props.selectedProject)
                                                ? lineFormater(
                                                      this.props.projects.get(this.props.selectedProject)
                                                          .project_datasets
                                                  )
                                                : '-'}{' '}
                                        </p>
                                        <p>
                                            <b>Experiment Runs: </b>
                                        </p>
                                        <p>
                                            {this.props.projects.has(this.props.selectedProject)
                                                ? lineFormater(
                                                      this.props.projects.get(this.props.selectedProject)
                                                          .project_experiments
                                                  )
                                                : '-'}{' '}
                                        </p>
                                    </div>
                                </Row>
                            </Col>
                        </Row>
                    )}
                </Col>
            </Row>
        );
    }
}
