import React, { Component } from 'react';
import { ListGroup, Button } from 'react-bootstrap';
import { scaleOrdinal, schemeTableau10 } from 'd3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare, faList, faLayerGroup, faChartLine } from '@fortawesome/free-solid-svg-icons';

export default class Run_Browser_Legend extends Component {
    constructor(props) {
        super(props);
    }

    colorScale = scaleOrdinal(schemeTableau10).domain(Array.from({ length: 10 }, (x, i) => i));

    getRunEntries() {
        const items = [];
        this.props.inExperiments.forEach((exp) =>
            items.push(
                this.props.highlightedRows.includes(exp.id) ? (
                    <ListGroup.Item key={exp.id} onClick={(e) => this.props.onHighlight(exp.id, false)}>
                        <FontAwesomeIcon style={{ color: this.colorScale(exp.id % 10) }} icon={faCheckSquare} />{' '}
                        {exp.id} | {exp.exp_name}
                    </ListGroup.Item>
                ) : (
                    <ListGroup.Item key={exp.id} onClick={(e) => this.props.onHighlight(exp.id, true)}>
                        <FontAwesomeIcon
                            style={{ color: this.colorScale(exp.id % 10), opacity: '50%' }}
                            icon={faCheckSquare}
                        />{' '}
                        {exp.id} | {exp.exp_name} {exp.id} | {exp.exp_name}
                    </ListGroup.Item>
                )
            )
        );
        return items;
    }

    render() {
        const run_entries = this.getRunEntries();

        return (
            <div>
                <div className="runbrowserstyles.group_button_div">
                    <Button
                        className="runbrowserstyles.group_button runbrowserstyles.top_button_div"
                        variant="light"
                        onClick={this.props.toggleAllRows}
                    >
                        <FontAwesomeIcon icon={faList} /> Toggle All
                    </Button>
                </div>
                <div className="runbrowserstyles.legend_div">
                    <ListGroup variant="flush">
                        {this.props.groupedRowIndices.length > 0 && (
                            <ListGroup.Item style={{ color: '#b1b1b1' }}>
                                {' '}
                                <b>Grouped experiments</b>
                            </ListGroup.Item>
                        )}
                        {run_entries.filter((run, i) =>
                            this.props.groupedRowIndices.includes(this.props.inExperiments[i].id)
                        )}
                        {this.props.combinedRowIndices.length > 0 && (
                            <ListGroup.Item style={{ color: '#b1b1b1' }}>
                                <FontAwesomeIcon
                                    style={{ color: this.colorScale(this.props.combinedRowIndices[0]), opacity: '50%' }}
                                    icon={faChartLine}
                                />
                                <b>Combined experiments</b>
                            </ListGroup.Item>
                        )}
                        {run_entries.filter((run, i) =>
                            this.props.combinedRowIndices.includes(this.props.inExperiments[i].id)
                        )}
                        {(this.props.groupedRowIndices.length > 0 || this.props.combinedRowIndices.length > 0) && (
                            <ListGroup.Item style={{ color: '#b1b1b1' }}>Remaining experiments</ListGroup.Item>
                        )}
                        {run_entries.filter(
                            (run, i) =>
                                !(
                                    this.props.groupedRowIndices.includes(this.props.inExperiments[i].id) ||
                                    this.props.combinedRowIndices.includes(this.props.inExperiments[i].id)
                                )
                        )}
                    </ListGroup>
                </div>
                <div className="runbrowserstyles.group_button_div">
                    <Button
                        className="runbrowserstyles.group_button"
                        variant="light"
                        onClick={this.props.activeRowsToGroup}
                    >
                        <FontAwesomeIcon icon={faLayerGroup} /> group
                    </Button>
                    <Button variant="light" onClick={this.props.combineRows}>
                        <FontAwesomeIcon icon={faChartLine} /> combine
                    </Button>
                </div>
            </div>
        );
    }
}
