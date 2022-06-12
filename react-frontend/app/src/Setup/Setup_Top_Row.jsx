import React, { PureComponent } from 'react';
import Environment_Diagram from '../Common/Environment_Diagram';
import Detail_Window from '../Common/Detail_Window';
import Custom_Rendering_Provider from '../Custom_Rendering/Custom_Rendering_Provider';
import { Row, Col } from 'react-bootstrap';
import Setup_Benchmark_Embedding from './Setup_Benchmark_Embedding';
import Setup_Linegraph from './Setup_Linegraph';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { config } from '../app_config';
import { Collapse } from 'react-bootstrap';

export default class Setup_Top_Row extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            space_info: { obs_space: undefined, action_space: undefined },
            collapse_explainer_window: true,
        };
    }

    componentDidMount() {
        const space_info = this.props.spaceInfo;
        this.setState({ space_info: space_info });
    }

    componentDidUpdate() {
        const space_info = this.props.spaceInfo;
        this.setState({ space_info: space_info });
    }

    render() {
        return (
            <Row>
                <div
                    className="position-absolute top-0 end-0"
                    style={{
                        width: '15%',
                        marginRight: 15,
                        marginTop: 100,
                        padding: 5,
                        backgroundColor: 'rgba(240, 240, 240, 0.6)',
                        zIndex: 2,
                    }}
                >
                    <p>
                        <b>Explore/Validate Env.</b>
                        <FontAwesomeIcon
                            icon={faCaretDown}
                            onClick={() => {
                                const old_toggle = this.state.collapse_explainer_window;
                                this.setState({ collapse_explainer_window: !old_toggle });
                            }}
                        />
                    </p>
                    <Collapse in={this.state.collapse_explainer_window}>
                        <div>
                            <p>
                                In this view, you can run a selected environment with random action selection, i.e. to
                                get an overview of the environment, available observations and actions.
                            </p>
                            <p>
                                Blue color always represents observations, red color represents actions, and gold
                                indicates rewards
                            </p>
                        </div>
                    </Collapse>
                </div>
                <Col md={7}>
                    <Row className="setupstyle.top_top_row">
                        <Col md={5} className="widgetstyles.top_left_column">
                            <div className="widgetstyles.header_title">
                                <p>
                                    <b>Observations</b>
                                </p>
                            </div>
                            <Detail_Window
                                data={this.props.data.obs}
                                dataSteps={this.props.steps.new}
                                spaceInfo={this.state.space_info.obs_space}
                                lineColor={config.observation_space_color}
                            />
                        </Col>
                        <Col md={3}>
                            <Row>
                                <Col className="justify-content-md-center" className="widgetstyles.env_diagram_column">
                                    {this.props.renderImage ? (
                                        <div className="widgetstyles.render_image_div">
                                            {Object.keys(config.custom_rendering_support).includes(
                                                this.props.envData.env_name
                                            ) ? (
                                                <Custom_Rendering_Provider
                                                    renderingEnv={
                                                        config.custom_rendering_support[this.props.envData.env_name]
                                                    }
                                                    renderData={this.props.data.renders.slice(
                                                        this.props.steps.value,
                                                        this.props.steps.new.value + 30
                                                    )}
                                                    secRenderData={[]}
                                                    obsSpaceInfo={this.props.spaceInfo.obs_space}
                                                    dataTimestamp={this.props.dataTimestamp}
                                                />
                                            ) : (
                                                <img
                                                    style={{ maxWidth: 300 }}
                                                    src={
                                                        '/routing/get_single_obs?step=' +
                                                        this.props.steps.new.value +
                                                        '&channels=[]&type=render&rdn=' +
                                                        Math.random()
                                                    }
                                                ></img>
                                            )}
                                        </div>
                                    ) : (
                                        <Environment_Diagram
                                            data={this.props.envData}
                                            benchmarkTime={this.props.benchmarkTime}
                                        />
                                    )}
                                </Col>
                            </Row>
                        </Col>
                        <Col md={4} className="widgetstyles.top_right_column">
                            <Detail_Window
                                data={this.props.data.actions}
                                dataSteps={this.props.steps.new}
                                spaceInfo={this.state.space_info.action_space}
                                lineColor={config.action_space_color}
                            />
                            <Detail_Window
                                data={this.props.data.rews}
                                dataSteps={this.props.steps.new}
                                lineColor={config.reward_color}
                            />
                        </Col>
                    </Row>
                    <Setup_Linegraph
                        data={[this.props.data.rews, this.props.data.dones]}
                        lineColor={config.reward_color}
                        setHighlight={this.props.setHighlightSteps}
                        highlightSteps={this.props.steps}
                        dataAggregationMode={this.state.rew_aggr_mode}
                        dataTimestamp={this.state.data_timestamp}
                    />
                </Col>
                <Col md={5}>
                    <Setup_Benchmark_Embedding
                        selectDatapoint={this.props.setHighlightSteps}
                        currentRewardData={this.props.data.rews}
                        currentDoneData={this.props.data.dones}
                        timeStamp={this.props.dataTimestamp}
                        currentSteps={this.props.steps.new}
                    />
                </Col>
            </Row>
        );
    }
}
