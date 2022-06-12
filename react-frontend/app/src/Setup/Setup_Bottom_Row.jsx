import React, { PureComponent } from 'react';
import Space_Widget from '../Common/Space_Widget.jsx';
import Spaces_Histogram from '../Common/Spaces_Histogram';
import { Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faThumbtack, faChartLine, faChartBar } from '@fortawesome/free-solid-svg-icons';
import { config } from '../app_config';

export default class Setup_Bottom_Row extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            in_edit_mode: false,
            pinned: false,
            space_info: { obs_space: undefined, action_space: undefined },
            temporary_tag_list: {},
            diagram_mode: 'histogram',
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

    setEditMode() {
        const new_edit_mode = !this.state.in_edit_mode;
        const space_info = this.state.space_info;
        //Copy over the changes made to the tag names to local space info
        if (new_edit_mode === false) {
            const tmp_tag_list = this.state.temporary_tag_list;
            Object.keys(tmp_tag_list).forEach((key) => {
                // Prefix determines if obs or action space tag, i.e. obs_tag_0
                const split_tag = key.split('_');
                const tag_key = split_tag[1] + '_' + split_tag[2];
                if (split_tag[0] === 'obs') space_info.obs_space[tag_key] = tmp_tag_list[key];
                else space_info.action_space[tag_key] = tmp_tag_list[key];
            });
        }
        this.setState(
            { in_edit_mode: new_edit_mode, space_info: space_info },
            this.props.setSpaceInfo(this.state.space_info)
        );
    }

    setPinned() {
        const new_pinned = !this.state.pinned;
        this.setState({ pinned: new_pinned });
    }

    changeDiagramMode() {
        if (this.state.diagram_mode === 'histogram') this.setState({ diagram_mode: 'line_graph' });
        else this.setState({ diagram_mode: 'histogram' });
    }

    setTemporaryTags(event) {
        const tmp_tag_list = this.state.temporary_tag_list;
        tmp_tag_list[event.target.name] = event.target.value;
        this.setState({ temporary_tag_list: tmp_tag_list });
    }

    render() {
        const highlightFilter = (x, i) => {
            return i >= this.props.steps.bottom && i <= this.props.steps.top;
        };
        return (
            <Row>
                <Col className="widgetstyles.top_left_column">
                    <div className="widgetstyles.widget_header">
                        <div className="widgetstyles.header_button" onClick={this.changeDiagramMode.bind(this)}>
                            <FontAwesomeIcon
                                style={{ color: 'rgb(0,0,255,0.5)' }}
                                icon={this.state.diagram_mode === 'histogram' ? faChartBar : faChartLine}
                                title="left"
                            />
                        </div>
                        <div
                            className={
                                'widgetstyles.header_button ' + (this.state.pinned ? 'widgetstyles.active_button' : '')
                            }
                            onClick={this.setPinned.bind(this)}
                        >
                            <FontAwesomeIcon style={{ color: 'rgba(0,0,255,0.5)' }} icon={faThumbtack} title="left" />
                        </div>
                        <div
                            className={
                                'widgetstyles.header_button ' +
                                (this.state.in_edit_mode ? 'widgetstyles.active_button' : '')
                            }
                            onClick={this.setEditMode.bind(this)}
                        >
                            <FontAwesomeIcon style={{ color: 'rgba(0,0,255,0.5)' }} icon={faPen} title="left" />
                        </div>
                        <div className="widgetstyles.header_title">
                            <p>
                                <b>Observation Distribution</b>
                            </p>
                        </div>
                    </div>
                    <Space_Widget
                        showHistogram={this.state.diagram_mode === 'histogram' ? true : false}
                        data={this.props.data.obs.filter(highlightFilter)}
                        datarowLabels={['Random Env.', 'Dataset']}
                        dataSteps={this.props.steps}
                        barColors={[config.observation_space_color, '#000000']}
                        spaceInfo={this.state.space_info.obs_space}
                        inEditMode={this.state.in_edit_mode}
                        onFormChange={this.setTemporaryTags.bind(this)}
                        tagPrefix="obs_"
                    />
                </Col>
                <Col className="widgetstyles.top_left_column">
                    <div className="widgetstyles.widget_header">
                        <div className="widgetstyles.header_button" onClick={this.changeDiagramMode.bind(this)}>
                            <FontAwesomeIcon
                                style={{ color: 'rgba(255,0,0,0.5)' }}
                                icon={this.state.diagram_mode === 'histogram' ? faChartBar : faChartLine}
                                title="left"
                            />
                        </div>
                        <div
                            className={
                                'widgetstyles.header_button ' + (this.state.pinned ? 'widgetstyles.active_button' : '')
                            }
                            onClick={this.setPinned.bind(this)}
                        >
                            <FontAwesomeIcon style={{ color: 'rgba(255,0,0,0.5)' }} icon={faThumbtack} title="left" />
                        </div>
                        <div
                            className={
                                'widgetstyles.header_button ' +
                                (this.state.in_edit_mode ? 'widgetstyles.active_button' : '')
                            }
                            onClick={this.setEditMode.bind(this)}
                        >
                            <FontAwesomeIcon style={{ color: 'rgba(255,0,0,0.5)' }} icon={faPen} title="left" />
                        </div>
                        <div className="widgetstyles.header_title">
                            <p>
                                <b>Action Distribution</b>
                            </p>
                        </div>
                    </div>
                    <Space_Widget
                        showHistogram={this.state.diagram_mode === 'histogram' ? true : false}
                        data={this.props.data.actions.filter(highlightFilter)}
                        datarowLabels={['Random Env.', 'Dataset']}
                        dataSteps={this.props.steps}
                        barColors={[config.action_space_color, '#000000']}
                        spaceInfo={this.state.space_info.action_space}
                        inEditMode={this.state.in_edit_mode}
                        onFormChange={this.setTemporaryTags.bind(this)}
                        tagPrefix="action_"
                    />
                    <div className={'widgetstyles.obs_action_space_detail'}></div>
                </Col>
                <Col>
                    <div className="widgetstyles.widget_header">
                        <div className="widgetstyles.header_title">
                            <p>
                                <b>Reward Distribution</b>
                            </p>
                        </div>
                    </div>
                    <div className="widgetstyles.reward_diagram_div">
                        <Spaces_Histogram
                            primaryData={this.props.data.rews}
                            barColors={[config.reward_color]}
                            dataSteps={this.props.steps}
                        />
                    </div>
                </Col>
            </Row>
        );
    }
}
