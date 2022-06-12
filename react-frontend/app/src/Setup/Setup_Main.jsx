import React, { Component } from 'react';
import axios from 'axios';
import { Container, Row, Button, Tabs, Tab, Col } from 'react-bootstrap';
import Setup_Dataset_View from './Setup_Dataset_View';
import Setup_Task_View from './Setup_Task_View';
import Setup_Benchmark_View from './Setup_Benchmark_View';

import '../css/Setup.module.css';

/**
 * Main component of the setup page. No shared state to other parts of the application.
 * Contains references to all submodules such as the task selection view, environment benchmark view,
 * datset explorer etc.
 */
export default class setup_main extends Component {
    constructor(props) {
        super(props);

        this.state = {
            projects: new Map(),
            selected_project_id: 0,
            selected_task: {
                id: '',
                name: '',
                description: '',
                environments: [],
                datasets: [],
                tags: [],
                tracking_items: new Map(),
                task_image_path: '',
            },
            active_tab: 'task',
        };
    }

    componentDidMount() {
        axios.get('/routing/get_projects').then((res) => {
            this.setState({ projects: new Map(res.data.map((item) => [item.id, item])) });
        });
    }

    setTab(new_tab_key) {
        this.setState({ active_tab: new_tab_key });
    }

    setProject(new_project_id) {
        if (new_project_id && Array.from(this.state.projects.keys()).includes(new_project_id.key)) {
            this.setState({ selected_project_id: new_project_id.key });
        }
    }

    render() {
        return (
            <Container fluid="true">
                <Tabs activeKey={this.state.active_tab} justify id="setup_right_tabs" onSelect={this.setTab.bind(this)}>
                    <Tab eventKey="task" title="1. Task">
                        <Setup_Task_View
                            projects={this.state.projects}
                            setProject={this.setProject.bind(this)}
                            selectedProject={this.state.selected_project_id}
                        />
                        <Row style={{ position: 'absolute', bottom: '0px', width: '100vw' }} className="footer_row">
                            <Col>
                                <Button
                                    style={{ float: 'right', marginBottom: 10 }}
                                    variant={
                                        this.state.projects.has(this.state.selected_project_id)
                                            ? 'primary'
                                            : 'outline-primary'
                                    }
                                    onClick={this.setTab.bind(this, 'environment')}
                                    disabled={!this.state.projects.has(this.state.selected_project_id)}
                                >
                                    Continue
                                </Button>
                                <p
                                    style={{
                                        float: 'right',
                                        marginRight: '20px',
                                        marginTop: 5,
                                        visibility: this.state.projects.has(this.state.selected_project_id)
                                            ? 'hidden'
                                            : 'visible',
                                    }}
                                    className="text-muted"
                                >
                                    Select a task to continue.
                                </p>
                            </Col>
                        </Row>
                    </Tab>
                    <Tab eventKey="environment" title="2. Environment (+Agent)">
                        <Setup_Benchmark_View
                            projects={this.state.projects}
                            setProject={this.setProject.bind(this)}
                            selectedProject={this.state.selected_project_id}
                        />
                    </Tab>
                    <Tab eventKey="dataset" title="3. Dataset*">
                        <Setup_Dataset_View
                            projects={this.state.projects}
                            setProject={this.setProject.bind(this)}
                            selectedProject={this.state.selected_project_id}
                        />
                    </Tab>
                    <Tab eventKey="review" title="4. Review">
                        <Setup_Task_View
                            projects={this.state.projects}
                            setProject={this.setProject.bind(this)}
                            selectedProject={this.state.selected_project_id}
                        />
                    </Tab>
                </Tabs>
            </Container>
        );
    }
}
