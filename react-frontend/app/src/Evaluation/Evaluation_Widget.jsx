import React, { PureComponent } from 'react';
import { Row, Col } from 'react-bootstrap';
import Detail_Window from '../Common/Detail_Window';
import Custom_Rendering_Provider from '../Custom_Rendering/Custom_Rendering_Provider';
import { config } from '../app_config';

export default class EvaluationWidget extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            chosen_action: undefined,
        };
    }

    chooseAction(action) {
        this.setState({ chosen_action: action });
    }

    getInfosFromStep() {
        const step_infos = this.props.currentEvalResults.infos[this.props.currentSteps.value];
        if (step_infos === undefined || step_infos.length === 0) {
            return <p>No Infos available for selected Step</p>;
        }
        return Object.entries(step_infos)
            .filter((e) => !['dummy', 'id', 'label'].includes(e[0]))
            .map((e) => (
                <p className="widgetstyles.smaller_margin" key={'info_' + e[0]}>
                    {e[0]}: <b>{parseFloat(e[1]).toFixed(0)}</b>
                </p>
            ));
    }

    render() {
        const is_image =
            this.props.currentEvalResults.env_space_info.obs_space !== undefined &&
            this.props.currentEvalResults.env_space_info.obs_space.is_image;

        return (
            <>
                <Row
                    style={{
                        textAlign: 'center',
                        paddingBottom: '5px',
                        paddingTop: '5px',
                        borderBottom: 'solid 2px #a5a5a5',
                    }}
                >
                    <h4>{'Details for  Step: ' + (this.props.currentSteps.value + 1)}</h4>
                </Row>
                <Row
                    className="widgetstyles.center_div"
                    style={{
                        marginTop: '10px',
                        marginBottom: '10px',
                        paddingBottom: '5px',
                        borderBottom: 'solid 2px #a5a5a5',
                    }}
                >
                    <Col>
                        <h5>Action Distribution</h5>
                        <p className="widgetstyles.grey_text">Probability Distribution of Actions (Network Output)</p>
                        <Detail_Window
                            data={this.props.currentEvalResults.actions}
                            probabilities={this.props.currentEvalResults.probabilities}
                            chooseAction={this.chooseAction.bind(this)}
                            spaceInfo={this.props.currentEvalResults.env_space_info.action_space}
                            dataSteps={this.props.currentSteps}
                            showProbs={true}
                            lineColor={config.action_space_color}
                        />
                    </Col>
                </Row>
                <Row className="justify-content-md-center" className="widgetstyles.center_div">
                    <Col>
                        <h5>Environment Detail View</h5>
                        <p>Rendering & Input Attributions</p>
                        {this.props.render &&
                        this.props.dataTimestamp > 0 &&
                        Object.keys(config.custom_rendering_support).includes(this.props.primaryEnvName) ? (
                            <Custom_Rendering_Provider
                                renderingEnv={config.custom_rendering_support[this.props.primaryEnvName]}
                                renderData={this.props.currentEvalResults.renders.slice(
                                    this.props.currentSteps.value,
                                    this.props.currentSteps.value + 30
                                )}
                                secRenderData={[]}
                                obsSpaceInfo={this.props.currentEvalResults.env_space_info.obs_space}
                                dataTimestamp={this.props.dataTimestamp}
                            />
                        ) : (
                            <>
                                <img
                                    width="40%"
                                    src={
                                        '/routing/get_single_obs?step=' +
                                        this.props.currentSteps.value +
                                        '&channels=[]&type=render&rdn=' +
                                        Math.random()
                                    }
                                ></img>
                                <img
                                    width={250}
                                    src={
                                        '/routing/get_single_obs?step=' +
                                        this.props.currentSteps.value +
                                        '&channels=[]&type=attr&rdn=' +
                                        Math.random()
                                    }
                                ></img>
                            </>
                        )}
                    </Col>
                </Row>
                <Row className="widgetstyles.center_div" style={{ marginTop: '6px', marginBottom: '10px' }}>
                    <Col>
                        <h6>
                            Step Reward: <b>{this.props.currentEvalResults.rews[this.props.currentSteps.value]}</b>
                        </h6>
                    </Col>
                </Row>
                <Row className="widgetstyles.center_div">
                    <Col>
                        <h6>Step Infos</h6>
                        <p className="widgetstyles.grey_text">Additional Infos available for the selected Step</p>
                        {this.getInfosFromStep()}
                    </Col>
                </Row>
            </>
        );
    }
}

/*

                <Row className="widgetstyles.center_div">
                    <Col>
                        <p>{"Observation" + (this.props.explainer ? " & (Input Attributions)" : "")}</p>
                        <Detail_Window
                            showExplanation={this.props.explainer}
                            data={this.props.currentEvalResults.obs}
                            attrData={this.props.currentEvalResults.attr}
                            spaceInfo={this.props.currentEvalResults.env_space_info.obs_space}
                            dataSteps={this.props.currentSteps}
                            isAttribution={true}
                            width={400}
                            lineColor={config.observation_space_color}/>
                        <p className="widgetstyles.grey_text">Observations passed to the network (max. last 3 channels). Input attributions display the pixel values that positively (green) or negatively (red) influence
                        the top chosen action</p>
                    </Col>
                </Row>


*/
