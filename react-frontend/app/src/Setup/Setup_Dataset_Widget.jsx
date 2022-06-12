import React, { PureComponent } from 'react';
import { Row, Col } from 'react-bootstrap';
import Detail_Window from '../Common/Detail_Window';
import Custom_Rendering_Provider from '../Custom_Rendering/Custom_Rendering_Provider';
import { config } from '../app_config';
import Step_Player from '../Common/Step_Player';

export default class EvaluationWidget extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            chosen_action: undefined,
            slice_step: 0,
            data_timestamp: 0,
        };
    }

    chooseAction(action) {
        this.setState({ chosen_action: action });
    }

    setHighlightSteps(new_steps) {
        this.setState({ slice_step: new_steps.value });
    }

    render() {
        const is_image = this.props.envInfo.obs_space !== undefined && this.props.envInfo.obs_space.is_image;

        return (
            <Col>
                {this.props.dataTimestamp > 0 && (
                    <div className={'widgetstyles.checkpoint'}>
                        <div className="widgetstyles.widget_header">
                            <div className="widgetstyles.checkpoint_header_title">
                                <p>
                                    <b>
                                        {'Checkpoint for ' +
                                            this.props.datasetPath +
                                            ' at ' +
                                            (this.props.step + 1) +
                                            ' steps'}
                                    </b>
                                </p>
                            </div>
                        </div>
                        <Row>
                            <Col className="widgetstyles.center_div" md={5}>
                                <p>Observation</p>
                                <Detail_Window
                                    returnType={'dataset_obs'}
                                    showExplanation={this.props.explainer}
                                    data={this.props.currentEvalResults.sampled_obs[this.props.step]}
                                    spaceInfo={this.props.envInfo.obs_space}
                                    dataSteps={{ value: this.state.slice_step, bottom: 0 }}
                                    width={450}
                                    lineColor={config.observation_space_color}
                                />
                            </Col>
                            <Col className="justify-content-md-center" className="widgetstyles.center_div" md={3}>
                                {this.props.requestRendering &&
                                Object.keys(config.custom_rendering_support).includes(this.props.envName) ? (
                                    <div>
                                        <p>Render</p>
                                        <Custom_Rendering_Provider
                                            renderingEnv={config.custom_rendering_support[this.props.envName]}
                                            renderData={this.props.currentEvalResults.sampled_obs[
                                                this.props.step
                                            ].slice(this.state.slice_step, this.state.slice_step + 30)}
                                            secRenderData={[]}
                                            obsSpaceInfo={this.props.envInfo.obs_space}
                                            dataTimestamp={this.props.dataTimestamp + this.props.step}
                                        />
                                    </div>
                                ) : (
                                    is_image && (
                                        <img
                                            width="300"
                                            src={
                                                '/routing/get_single_obs?step=' +
                                                this.props.step +
                                                '&channels=[]&type=render&rdn=' +
                                                Math.random()
                                            }
                                        ></img>
                                    )
                                )}
                            </Col>
                            <Col className="widgetstyles.center_div">
                                <p>Action</p>
                                <Detail_Window
                                    data={this.props.currentEvalResults.sampled_actions[this.props.step]}
                                    probabilities={this.props.currentEvalResults.probabilities}
                                    chooseAction={this.chooseAction.bind(this)}
                                    spaceInfo={this.props.envInfo.action_space}
                                    dataSteps={{ value: this.state.slice_step, bottom: 0 }}
                                    showProbs={true}
                                    width={400}
                                    lineColor={config.action_space_color}
                                />
                            </Col>
                        </Row>
                        <Row className="justify-content-md-center">
                            <Step_Player
                                stepState={{
                                    new: { bottom: 0, top: this.props.stepsPerSample, value: this.state.slice_step },
                                }}
                                setSteps={this.setHighlightSteps.bind(this)}
                                colapsed={false}
                            />
                        </Row>
                    </div>
                )}
            </Col>
        );
    }
}
