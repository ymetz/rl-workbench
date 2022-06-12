import React, { Component } from 'react';
import * as d3 from 'd3';

export default class action_prob_diagram extends Component {
    constructor(props) {
        super(props);
        this.actionProbRef= React.createRef();
    }

    componentDidMount() {
        if (this.props.probabilities !== undefined)
            this.drawChart(this.props.data, this.props.probabilities, this.props.chooseAction, this.props.spaceInfo);
    }

    componentDidUpdate() {
        if (this.props.probabilities !== undefined)
            this.drawChart(this.props.data, this.props.probabilities, this.props.chooseAction, this.props.spaceInfo);
    }

    drawChart(data, probabilities, chooseAction, spaceInfo) {
        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const svgWidth = 300;
        const svgHeight = 250;
        const barHeight = probabilities.length > 0 ? svgHeight / probabilities.length : svgHeight;

        d3.select(this.actionProbRef.current.current).select('*').remove();

        const svg = d3
            .select(this.actionProbRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const x = d3.scaleLinear().range([0, 100]);

        const action_groups = svg
            .selectAll('.action_g')
            .data(probabilities)
            .enter()
            .append('g')
            .attr('class', 'action_g')
            .attr('transform', (d, i) => 'translate(0,' + barHeight * i + ')');

        action_groups
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', svgWidth)
            .attr('height', barHeight)
            .attr('opacity', 0.0)
            .on('click', (d, i) => chooseAction(i));

        action_groups
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', barHeight - 5)
            .attr('width', (d) => x(d))
            .style('fill', (d, i) => (i === data ? '#24b016' : '#d30d0a'));

        action_groups
            .append('text')
            .attr('x', 125)
            .attr('y', barHeight / 2)
            .attr('text-anchor', 'start')
            .attr('font-weight', (d, i) => (i === data ? 'bold' : 'normal'))
            .text((d, i) => spaceInfo['tag_' + i] + ' : ' + (d * 100).toFixed(2) + ' %');
    }

    render() {
        return <div ref={this.actionProbRef}></div>;
    }
}
