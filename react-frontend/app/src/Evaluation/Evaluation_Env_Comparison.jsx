import React, { PureComponent } from 'react';
import Space_Widget from '../Common/Space_Widget.jsx';
import { Row, Col, ListGroup, Button } from 'react-bootstrap';
import axios from 'axios';
import { config } from '../app_config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';

export default class EvaluationEnvComparison extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            benchmark_steps: 2048,
            request_rendering: false,
            primary_benchmark_results: { obs: [], rews: [], dones: [], actions: [] },
            secondary_benchmark_results: { obs: [], rews: [], dones: [], actions: [] },
            current_env_info: { obs_space: undefined, action_space: undefined },
            data_timestamp: 0,
            benchmark_time: { nr_of_steps: 0, benchmark_time: 0 },
            diagram_mode: 'histogram',
            data_focus: 'primary',
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props !== prevProps && this.props.primaryEnv !== undefined && this.props.secondaryEnv !== undefined)
            this.getBenchmarkResults();
    }

    getBenchmarkResults() {
        const n_steps = this.state.benchmark_steps;
        const rendering = this.state.request_rendering ? 1 : 0;
        [this.props.primaryEnv, this.props.secondaryEnv].forEach((env, i) => {
            axios
                .get('/routing/run_benchmark?env_id=' + env.id + '&n_steps=' + n_steps + '&rendering=' + rendering)
                .then((res) => {
                    const buffers = res.data;
                    if (i === 0) {
                        this.setState({
                            primary_benchmark_results: {
                                obs: buffers.obs,
                                rews: buffers.rews,
                                dones: buffers.dones,
                                actions: buffers.actions,
                            },
                        });
                    } else {
                        this.setState({
                            secondary_benchmark_results: {
                                obs: buffers.obs,
                                rews: buffers.rews,
                                dones: buffers.dones,
                                actions: buffers.actions,
                            },
                        });
                    }
                    this.setState({
                        data_timestamp: buffers.data_timestamp,
                        current_env_info: buffers.env_space_info,
                        benchmark_time: { nr_of_steps: n_steps, benchmark_time: buffers.benchmark_time },
                        show_render_image: rendering == 1 ? true : false,
                    });
                });
        });
    }

    setActiveData(type) {
        this.setState({ data_focus: type });
    }

    changeDiagramMode() {
        if (this.state.diagram_mode === 'histogram') this.setState({ diagram_mode: 'line_graph' });
        else this.setState({ diagram_mode: 'histogram' });
    }

    render() {
        return (
            <Col>
                <Row>
                    <Col className="widgetstyles.center_div">
                        <Space_Widget
                            showHistogram={this.state.diagram_mode === 'histogram' ? true : false}
                            data={
                                this.state.data_focus === 'primary'
                                    ? this.state.primary_benchmark_results.obs
                                    : this.state.secondary_benchmark_results.obs
                            }
                            secondaryData={
                                this.state.data_focus === 'primary'
                                    ? this.state.secondary_benchmark_results.obs
                                    : this.state.primary_benchmark_results.obs
                            }
                            datarowLabels={['Primary Env.', 'Evaluation Env.']}
                            barColors={
                                this.state.data_focus === 'primary'
                                    ? [config.observation_space_color, 'red']
                                    : ['red', config.observation_space_color]
                            }
                            spaceInfo={this.state.current_env_info.obs_space}
                            inEditMode={false}
                            tagPrefix="obs_"
                        />
                    </Col>
                </Row>
                <Row className="widgetstyles.menu_footer_bar" className="justify-content-md-center">
                    <ListGroup horizontal>
                        <ListGroup.Item
                            onClick={this.setActiveData.bind(this, 'primary')}
                            active={this.state.data_focus === 'primary'}
                        >
                            <FontAwesomeIcon
                                style={{ color: config.observation_space_color }}
                                icon={faCoffee}
                                title="left"
                            />
                            Training Environment: {this.props.primaryEnv ? this.props.primaryEnv.env_name : ''}
                        </ListGroup.Item>
                        <ListGroup.Item
                            onClick={this.setActiveData.bind(this, 'secondary')}
                            active={this.state.data_focus === 'secondary'}
                        >
                            <FontAwesomeIcon style={{ color: 'rgba(255,0,0,0.5)' }} icon={faCoffee} title="left" />
                            Validation Environment: {this.props.secondaryEnv ? this.props.secondaryEnv.env_name : ''}
                        </ListGroup.Item>
                    </ListGroup>
                    <Button onClick={this.changeDiagramMode.bind(this)} variant="link">
                        <FontAwesomeIcon style={{ color: 'rgba(255,0,0,0.5)' }} icon={faCoffee} title="left" />
                    </Button>
                </Row>
            </Col>
        );
    }
}
