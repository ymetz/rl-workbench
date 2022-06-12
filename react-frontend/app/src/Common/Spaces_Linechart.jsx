import React, { Component } from 'react';
import * as d3 from 'd3';

/***
 * Renders a linechart based on 1D-array data. Similar to the histogram visualization, it takes
 * up to two data rows. The secondary data row should have equal length to primary data.
 */
export default class spaces_linechart extends Component {
    constructor(props) {
        super(props);
        this.linegraphRef = React.createRef();
    }

    componentDidMount() {
        if (this.props.primaryData.length > 0)
            this.drawChart(
                this.props.primaryData,
                this.props.secondaryData,
                this.props.lineColors,
                this.props.lowHigh,
                this.props.dim,
                this.props.dataSteps
            );
    }

    componentDidUpdate() {
        if (this.props.primaryData.length > 0)
            this.drawChart(
                this.props.primaryData,
                this.props.secondaryData,
                this.props.lineColors,
                this.props.lowHigh,
                this.props.dim,
                this.props.dataSteps
            );
    }

    drawChart(data, secondary_data, line_colors, lowHigh, dim, dataSteps) {
        const margin = { top: 15, right: 10, bottom: 30, left: 30 };
        const svgWidth = this.linegraphRef.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = 250 - margin.top - margin.bottom;
        let y_bottom = d3.min(data);
        let y_top = d3.max(data);
        const x_domain = data.length > 0 ? data.length - 1 : 1024;
        if (lowHigh && !Array.isArray(lowHigh[0])) {
            y_bottom = lowHigh[0];
            y_top = lowHigh[1];
        } else if (lowHigh && !(lowHigh[0][dim] < -10e35) && !(lowHigh[1][dim] > 10e35)) {
            // if space bounds are infinite (max float values), do not set bounds
            y_bottom = lowHigh[0][dim];
            y_top = lowHigh[1][dim];
        }
        let data_point;
        if (dataSteps !== undefined) {
            data_point = data[dataSteps.value - dataSteps.bottom];
        }

        d3.select(this.linegraphRef.current.current).select('*').remove();

        const svg = d3
            .select(this.linegraphRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const x = d3.scaleLinear().domain([0, x_domain]).range([0, svgWidth]);
        const xAxis = svg
            .append('g')
            .attr('transform', 'translate(0,' + svgHeight + ')')
            .call(d3.axisBottom(x));

        const y_domain = [y_bottom, y_top];
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

        // Draw secondary line first to be in the background.
        if (secondary_data !== undefined) {
            const secondary_line = svg
                .append('path')
                .datum(secondary_data)
                .attr('fill', 'none')
                .attr('stroke', line_colors[1])
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
                        .curve(d3.curveMonotoneX)
                );
        }

        const primary_path = svg
            .append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', line_colors[0])
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
                    .curve(d3.curveMonotoneX)
            );
    }

    render() {
        return (
            <div ref={this.linegraphRef}>
                <p style={{ color: 'grey', padding: '10px' }}>
                    Run the environment benchmark to collect & visualize data
                </p>
            </div>
        );
    }
}
