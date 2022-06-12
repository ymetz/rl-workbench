import React, { PureComponent } from 'react';
import '../css/Setup.module.css';
import * as d3 from 'd3';
import { config } from '../app_config';

export default class Callback_Linegraph extends PureComponent {
    constructor(props) {
        this.linegraphRef = React.createRef();
        super(props);
    }

    componentDidMount() {
        this.drawChart(this.props.data[0], this.props.data[1], this.props.stepValue);
    }

    componentDidUpdate() {
        if (this.props.data.length > 0) {
            this.drawChart(this.props.data[0], this.props.data[1], this.props.stepValue);
        }
    }

    drawChart(data, dones, step_value) {
        const margin = { top: 10, right: 30, bottom: 20, left: 10 };
        const svgWidth = 430 - margin.left - margin.right;
        const svgHeight = 240 - margin.top - margin.bottom;
        const x_domain = data.length > 0 ? data.length - 1 : 1024;

        d3.select(this.linegraphRef.current.current).select('*').remove();

        const svg = d3
            .select(this.linegraphRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const x = d3.scaleLinear().domain([0, data.length]).range([0, svgWidth]);
        const xAxis = svg
            .append('g')
            .attr('transform', 'translate(0,' + svgHeight + ')')
            .call(d3.axisBottom(x));

        const y_domain = data.length > 0 ? [d3.min(data), d3.max(data)] : [-1, 1];
        const y = d3.scaleLinear().range([svgHeight, 0]).domain(y_domain);

        svg.append('g')
            .call(d3.axisRight(y).tickSize(svgWidth))
            .call((g) => g.select('.domain').remove())
            .call((g) =>
                g
                    .selectAll('.tick:not(:first-of-type) line')
                    .attr('stroke-opacity', 0.5)
                    .attr('stroke-dasharray', '2,2')
            )
            .call((g) => g.selectAll('.tick text').attr('x', 4).attr('dy', -4));

        const done_lines = svg
            .append('g')
            .selectAll('line')
            .data(dones)
            .enter()
            .append('line')
            .attr('x1', (d) => x(d))
            .attr('x2', (d) => x(d))
            .attr('y1', 0)
            .attr('y2', svgHeight)
            .attr('stroke', '#a0a0a0');

        const data_path = svg
            .append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', () => {
                return config.reward_color;
            })
            .attr('stroke-width', 1.5)
            .attr(
                'd',
                d3
                    .line()
                    .x(function (d, i) {
                        return x(i);
                    })
                    .y(function (d) {
                        return y(d);
                    })
            );

        const step_line = svg
            .append('g')
            .append('rect')
            .attr('x', x(step_value))
            .attr('y', 0)
            .attr('height', svgHeight)
            .attr('width', 3)
            .attr('fill', '#ff3737')
            .attr('opacity', '0.6');

        function mouseover() {
            focus.style('opacity', 1);
            focusText.style('opacity', 1);
        }
    }

    render() {
        return <div ref={this.linegraphRef}></div>;
    }
}
