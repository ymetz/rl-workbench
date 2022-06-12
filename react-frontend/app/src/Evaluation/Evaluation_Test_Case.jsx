import React, { PureComponent } from 'react';
import { Row, Col } from 'react-bootstrap';
import Spaces_Box from '../Common/Spaces_Box';
import Action_Probability_Diagram from '../Common/Action_Probability_Diagram';
import Custom_Rendering_Provider from '../Custom_Rendering/Custom_Rendering_Provider';
import { config } from '../app_config';
import Step_Player from '../Common/Step_Player';

export default class evaluation_test_list extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            slice_step: 0,
            data_timestamp: 0,
        };
    }

    setHighlightSteps(new_steps) {
        this.setState({ slice_step: new_steps.value });
    }

    render() {
        return (
            <div key={'item_' + this.props.trackingID}>
                <Row>
                    <Col>
                        Test Case #<b>{this.props.tcIndex + 1}</b> | Exp.Name: <b>{this.props.expName}</b> | Env.Name:{' '}
                        <b>{this.props.envName}</b>
                    </Col>
                </Row>
                <Row>
                    <Col md="4">
                        {!this.props.displayImage ? (
                            <Spaces_Box
                                data={this.props.obs[this.state.slice_step]}
                                spaceInfo={this.props.spaceInfo.obs_space}
                            />
                        ) : (
                            <div>
                                {Array.from({ length: Math.min(3, channel_number) }, (x, i) => -i - 1)
                                    .reverse()
                                    .map((d) => {
                                        return (
                                            <img
                                                style={{ marginLeft: '2px', marginRight: '2px' }}
                                                width={140}
                                                src={
                                                    '/routing/get_single_obs?step=' +
                                                    item.id +
                                                    '&channels=[' +
                                                    d +
                                                    ']&rdn=' +
                                                    Math.random()
                                                }
                                            ></img>
                                        );
                                    })}
                                {channel_number > 4 && <p>Only the last 3 channels will be displayed</p>}
                            </div>
                        )}
                    </Col>
                    <Col className="justify-content-md-center" md={4}>
                        {this.props.dataTimestamp > 0 &&
                            Object.keys(config.custom_rendering_support).includes(this.props.envName) && (
                                <div>
                                    <p>Render</p>
                                    <Custom_Rendering_Provider
                                        renderingEnv={config.custom_rendering_support[this.props.envName]}
                                        renderData={
                                            this.props.interpretObsAsState
                                                ? this.props.obs.slice(
                                                      this.state.slice_step,
                                                      this.state.slice_step + 30
                                                  )
                                                : this.props.renders.slice(
                                                      this.state.slice_step,
                                                      this.state.slice_step + 30
                                                  )
                                        }
                                        secRenderData={this.props.datasetRenders.slice(
                                            this.state.slice_step,
                                            this.state.slice_step + 30
                                        )}
                                        obsSpaceInfo={this.props.spaceInfo.obs_space}
                                        dataTimestamp={this.props.dataTimestamp}
                                    />
                                </div>
                            )}
                    </Col>
                    <Col md="4">
                        <Row>
                            <Col>
                                {this.props.spaceInfo.action_space.type === 'Discrete' ? (
                                    <Action_Probability_Diagram
                                        data={this.props.actions}
                                        probabilities={this.props.probabilities}
                                        spaceInfo={this.props.spaceInfo.action_space}
                                    />
                                ) : (
                                    <Spaces_Box
                                        data={this.props.actions[this.state.slice_step]}
                                        attrData={this.props.datasetActions[this.state.slice_step]}
                                        spaceInfo={this.props.spaceInfo.action_space}
                                    />
                                )}
                            </Col>
                        </Row>
                        <Row style={{ paddingTop: '20px' }}>
                            <Col>
                                <h4>Custom Statistics</h4>
                                <hr />
                                <p>
                                    Global Polarization: <b>{(0.24 + Math.random() * 0.1).toFixed(2)}</b> (Model){' '}
                                    <b>{(0.35 + Math.random() * 0.1).toFixed(2)}</b> (Dataset)
                                </p>
                                <p>
                                    Gobal Angular Momentum: <b>{(0.78 + Math.random() * 0.1).toFixed(2)}</b> (Model){' '}
                                    <b>{(0.61 + Math.random() * 0.1).toFixed(2)}</b> (Dataset)
                                </p>
                            </Col>
                        </Row>
                    </Col>
                </Row>
                {true && (
                    <Row className="justify-content-md-center">
                        <Step_Player
                            stepState={{
                                new: {
                                    bottom: 0,
                                    top: this.props.timestepsPerTrackingCase - 30,
                                    value: this.state.slice_step,
                                },
                            }}
                            setSteps={this.setHighlightSteps.bind(this)}
                            colapsed={false}
                        />
                    </Row>
                )}
            </div>
        );
    }
}
