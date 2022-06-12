import React, { Component } from 'react';
import { Nav, Form } from 'react-bootstrap';
import Spaces_Histogram from './Spaces_Histogram';
import Spaces_Linechart from './Spaces_Linechart';
import Spaces_Heatmap from './Spaces_Heatmap';
import '../css/Widgets.module.css';

const discrete_types = ['Discrete', 'MultiDiscrete'];

export default class space_widget extends Component {
    constructor(props) {
        super(props);

        this.state = {
            chosen_dim: 0,
        };
    }

    get_options(space_info, inEditMode) {
        if (space_info === undefined || space_info.dimensions === undefined) return;
        //Make sure to only use the last value in the shape array
        const dim_array_length = discrete_types.includes(space_info.type)
            ? space_info.n
            : space_info.dimensions[space_info.dimensions.length - 1];
        const return_array = [];
        if (discrete_types.includes(space_info.type))
            return_array.push(
                <Nav.Link disabled className="spaces_menu_identifier">
                    {space_info.type + ' ' + dim_array_length}
                </Nav.Link>
            );
        for (let i = 0; i < dim_array_length; i++) {
            if (inEditMode)
                return_array.push(
                    <Form.Control
                        name={this.props.tagPrefix + 'tag_' + i}
                        onChange={this.props.onFormChange}
                        type="text"
                        placeholder={space_info['tag_' + i]}
                    />
                );
            else
                return_array.push(
                    <Nav.Link className={this.state.chosen_dim === i ? 'navlink_active' : ''} eventKey={i}>
                        {space_info['tag_' + i]}
                    </Nav.Link>
                );
        }
        return return_array;
    }

    get_column(data, column_index) {
        if (data === undefined) return;
        // for 1D-Arrays (a.k.a. Discrete spaces, just return the array)
        if (!Array.isArray(data[0])) return data;
        const column = [];
        for (let i = 0; i < data.length; i++) {
            column.push(data[i][column_index]);
        }
        return column;
    }

    change_current_data_dim(event) {
        const new_dim = parseInt(event);
        this.setState({ chosen_dim: new_dim });
    }

    render() {
        if (!this.props.spaceInfo) {
            return <div></div>;
        } else {
            return (
                <div className="space_widget_container">
                    <div className="spaces_menu">
                        {this.props.inEditMode ? (
                            <Form on>
                                <Form.Group controlId="dim_names">
                                    {this.get_options(this.props.spaceInfo, true)}
                                </Form.Group>
                            </Form>
                        ) : (
                            <Nav
                                defaultActiveKey="0"
                                className="flex-column"
                                onSelect={this.change_current_data_dim.bind(this)}
                            >
                                {this.get_options(this.props.spaceInfo, false)}
                            </Nav>
                        )}
                    </div>
                    <div className="space_widget_viz">
                        {this.props.spaceInfo.type === 'Box' && this.props.spaceInfo.is_image ? (
                            <Spaces_Heatmap
                                heatmapData={this.props.data}
                                dataSteps={this.props.dataSteps}
                                lowHigh={[this.props.spaceInfo.low, this.props.spaceInfo.high]}
                            />
                        ) : (
                            <div>
                                {this.props.showHistogram ? (
                                    <Spaces_Histogram
                                        primaryData={this.get_column(this.props.data, this.state.chosen_dim)}
                                        secondaryData={this.get_column(this.props.secondaryData, this.state.chosen_dim)}
                                        datarowLabels={this.props.datarowLabels}
                                        dataSteps={this.props.dataSteps}
                                        barColors={this.props.barColors}
                                        lowHigh={[this.props.spaceInfo.low, this.props.spaceInfo.high]}
                                        dim={this.state.chosen_dim}
                                    />
                                ) : (
                                    <Spaces_Linechart
                                        primaryData={this.get_column(this.props.data, this.state.chosen_dim)}
                                        secondaryData={this.get_column(this.props.secondaryData, this.state.chosen_dim)}
                                        datarowLabels={this.props.datarowLabels}
                                        dataSteps={this.props.dataSteps}
                                        lineColors={this.props.barColors}
                                        lowHigh={[this.props.spaceInfo.low, this.props.spaceInfo.high]}
                                        dim={this.state.chosen_dim}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    }
}
