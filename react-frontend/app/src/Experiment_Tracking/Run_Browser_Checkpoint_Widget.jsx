import React, { PureComponent } from 'react';
import { Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { config } from '../app_config';
import Detail_Window from '../Common/Detail_Window';
import Step_Player from '../Common/Step_Player';
import Run_Browser_Callback_Linegraph from './Run_Browser_Callback_Linegraph';

export default class CheckpointWidget extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            current_eval_results: {
                obs: [],
                rews: [],
                dones: [],
                actions: [],
                env_space_info: { obs_space: {}, action_space: {} },
            },
            data_timestamp: 0,
            env_name: '',
            current_exp_id: -1,
            current_exp_steps: -1,
            current_highlight_steps: {
                previous: { bottom: 0, top: 1023, value: 0 },
                new: { bottom: 0, top: 1023, value: 0 },
            },
            play: false,
        };
    }

    componentDidMount() {
        if (this.props.checkpointExpId !== -1) {
            const exp_id = this.props.expIdArray[this.props.checkpointExpId];
            const exp_step = this.props.evalStep;
            this.setState({ current_exp_id: exp_id, current_exp_steps: exp_step }, this.getEvalData(exp_id, exp_step));
        }
    }

    componentDidUpdate() {
        if (this.props.checkpointExpId !== -1) {
            const exp_id = this.props.expIdArray[this.props.checkpointExpId];
            const exp_step = this.props.evalStep;
            if (exp_id !== this.state.current_exp_id || this.state.current_exp_steps !== exp_step) {
                this.setState(
                    { current_exp_id: exp_id, current_exp_steps: exp_step },
                    this.getEvalData(exp_id, exp_step)
                );
            }
        }
    }

    getEvalData(exp_id, eval_step) {
        axios.get('/routing/get_run_eval_results?exp_id=' + exp_id + '&run_eval_step=' + eval_step).then((res) => {
            const buffers = res.data;
            this.setState(
                {
                    current_eval_results: {
                        obs: buffers.obs,
                        rews: buffers.rews,
                        dones: buffers.dones,
                        actions: buffers.actions,
                        env_space_info: buffers.env_space_info,
                    },
                    data_timestamp: buffers.data_timestamp,
                    env_name: buffers.env_name,
                },
                () => {
                    const old_steps = this.state.current_highlight_steps.new;
                    this.setState({
                        current_highlight_steps: {
                            previous: old_steps,
                            new: { bottom: 0, top: buffers['rews'].length, value: 0 },
                        },
                    });
                    this.props.setCurrentItem({
                        experiment_id: this.props.expIdArray[this.props.checkpointExpId],
                        experiment_name: this.props.experiments[this.props.checkpointExpId]['exp_name'],
                        env_space_info: buffers.env_space_info,
                        step_value: 0,
                        data_timestamp: buffers.data_timestamp,
                        env_name: buffers.env_name,
                        env_id: -1,
                        obs: buffers.obs[0],
                    });
                }
            );
        });
    }

    setHighlightSteps(new_steps) {
        const old_steps = this.state.current_highlight_steps;
        this.setState({ current_highlight_steps: { previous: old_steps.new, new: new_steps } });
        this.props.setCurrentItem({
            experiment_id: this.props.expIdArray[this.props.checkpointExpId],
            experiment_name: this.props.experiments[this.props.checkpointExpId]['exp_name'],
            step_value: new_steps.value,
            data_timestamp: this.state.data_timestamp,
            env_name: this.state.env_name,
            env_space_info: this.state.current_eval_results.env_space_info,
            env_id: -1,
            obs: this.state.current_eval_results.obs[new_steps.value],
        });
    }

    render() {
        if (this.props.checkpointExpId === -1) {
            return <div></div>;
        } else {
            return (
                <div positionOffset={{ x: 0, y: -800 }} style={{ zIndex: 1 }}>
                    <div className={'widgetstyles.checkpoint_outer'}>
                        <div className={'widgetstyles.checkpoint'}>
                            <div className="widgetstyles.widget_header">
                                <div
                                    className={'widgetstyles.header_button'}
                                    onClick={this.props.toggleCheckpointWidget}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </div>
                                <div className="widgetstyles.checkpoint_header_title">
                                    <p>
                                        <b>
                                            {'Checkpoint for ' +
                                                this.props.experiments[this.props.checkpointExpId]['exp_name'] +
                                                ' at ' +
                                                this.props.checkpointEvalSteps +
                                                ' steps'}
                                        </b>
                                    </p>
                                </div>
                            </div>
                            <Row>
                                <Col className="widgetstyles.center_div">
                                    <p>Observation</p>
                                    <Detail_Window
                                        data={this.state.current_eval_results.obs}
                                        spaceInfo={this.state.current_eval_results.env_space_info.obs_space}
                                        dataSteps={this.state.current_highlight_steps.new}
                                        lineColor={config.observation_space_color}
                                    />
                                </Col>
                                <Col className="widgetstyles.center_div">
                                    <p>Reward</p>
                                    <Detail_Window
                                        data={this.state.current_eval_results.rews}
                                        dataSteps={this.state.current_highlight_steps.new}
                                        lineColor={config.reward_color}
                                    />
                                    <Run_Browser_Callback_Linegraph
                                        data={[
                                            this.state.current_eval_results.rews,
                                            this.state.current_eval_results.dones,
                                        ]}
                                        stepValue={this.state.current_highlight_steps.new.value}
                                    />
                                    <Step_Player
                                        stepState={this.state.current_highlight_steps}
                                        setSteps={this.setHighlightSteps.bind(this)}
                                        colapsed={true}
                                    />
                                </Col>
                                <Col className="widgetstyles.center_div">
                                    <p>Action</p>
                                    <Detail_Window
                                        data={this.state.current_eval_results.actions}
                                        spaceInfo={this.state.current_eval_results.env_space_info.action_space}
                                        dataSteps={this.state.current_highlight_steps.new}
                                        lineColor={config.action_space_color}
                                    />
                                </Col>
                            </Row>
                        </div>
                    </div>
                </div>
            );
        }
    }
}
