import React, { Component } from 'react';
import * as d3 from 'd3';

/***
 * Renders a histogram based on 1D-array numerical data.
 * May take an optional second data row to plot an overlapping histogram.
 * Note that the secondary data dimensions must fit the primary data dimensions.
 */
export default class spaces_continuous_histogram extends Component {
    constructor(props) {
        super(props);
        this.spacesRef = React.createRef();
    }

    componentDidMount() {
        if (this.props.primaryData.length > 0)
            this.drawChart(
                this.props.primaryData,
                this.props.secondaryData,
                this.props.barColors,
                this.props.lowHigh,
                this.props.dim,
                this.props.dataSteps,
                this.props.datarowLabels
            );
    }

    componentDidUpdate() {
        if (this.props.primaryData.length > 0)
            this.drawChart(
                this.props.primaryData,
                this.props.secondaryData,
                this.props.barColors,
                this.props.lowHigh,
                this.props.dim,
                this.props.dataSteps,
                this.props.datarowLabels
            );
    }

    drawChart(data, secondary_data, bar_colors, lowHigh, dim, dataSteps, datarow_labels) {
        const margin = { top: 15, right: 10, bottom: 30, left: 30 };
        const svgWidth = this.spacesRef.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = 250 - margin.top - margin.bottom;
        const nr_of_data_elements = new Set(data).size;
        const nr_of_bins =
            nr_of_data_elements < 30 ? nr_of_data_elements : Math.max(10, Math.round(nr_of_data_elements / 30));
        let x_bottom = d3.min(data);
        let x_top = d3.max(data);
        if (lowHigh && !Array.isArray(lowHigh[0])) {
            x_bottom = lowHigh[0];
            x_top = lowHigh[1];
        } else if (lowHigh && !(lowHigh[0][dim] < -10e35) && !(lowHigh[1][dim] > 10e35)) {
            // if space bounds are infinite (max float values), do not set bounds
            x_bottom = lowHigh[0][dim];
            x_top = lowHigh[1][dim];
        }
        let data_point;
        if (dataSteps !== undefined) {
            data_point = data[dataSteps.value - dataSteps.bottom];
        }

        d3.select(this.spacesRef ).select('*').remove();

        const svg = d3
            .select(this.spacesRef )
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const x = d3.scaleLinear().domain([x_bottom, x_top]).range([0, svgWidth]);
        svg.append('g')
            .attr('transform', 'translate(0,' + svgHeight + ')')
            .call(d3.axisBottom(x));

        // set the parameters for the histogram
        const histogram = d3
            .histogram()
            .value(function (d) {
                return d;
            })
            .domain(x.domain())
            .thresholds(x.ticks(nr_of_bins));

        // And apply this function to data to get the bins
        const primary_bins = histogram(data);
        let secondary_bins;
        if (secondary_data !== undefined && secondary_data.length > 0) secondary_bins = histogram(secondary_data);
        else secondary_bins = [];

        const bar_width = primary_bins[0].x1 - primary_bins[0].x0;

        const y = d3
            .scaleLinear()
            .range([svgHeight, 0])
            .domain([
                0,
                d3.max([...primary_bins, ...secondary_bins], function (d) {
                    return d.length;
                }),
            ]);
        svg.append('g').call(d3.axisLeft(y));

        // append the bar rectangles to the svg element, make sure to draw the secondary data first (means it is drawn in the background)
        const rects = svg
            .selectAll('rect')
            .data([...secondary_bins, ...primary_bins])
            .enter()
            .append('rect')
            .attr('x', 1)
            .attr('transform', function (d) {
                return 'translate(' + x(d.x0) + ',' + y(d.length) + ')';
            })
            .attr('width', function (d) {
                return x(d.x1) - x(d.x0) - 1;
            })
            .attr('height', function (d) {
                return svgHeight - y(d.length);
            });

        if (secondary_bins.length == 0) {
            rects.style('fill', function (d) {
                return data_point !== undefined &&
                    x(data_point + bar_width / 2) >= x(d.x0) &&
                    x(data_point + bar_width / 2) <= x(d.x1)
                    ? 'black'
                    : bar_colors[0];
            });
        } else {
            rects
                .style('fill', function (d, i) {
                    return i < primary_bins.length ? bar_colors[1] : bar_colors[0];
                })
                .style('opacity', 0.5);
        }

        if (secondary_bins.length > 0) {
            const focus_text_g = svg.append('g').attr('transform', 'translate(10,10)');

            focus_text_g
                .selectAll('.primary_circles')
                .data(function () {
                    return Array.from({ length: 2 }, (x, i) => i);
                })
                .enter()
                .append('circle')
                .attr('class', 'primary_circles')
                .attr('r', 5)
                .attr('fill', (_, i) => bar_colors[i])
                .attr('cy', (_, i) => (i == 0 ? 0 : 20))
                .style('opacity', 0.8);

            focus_text_g
                .selectAll('text')
                .data(datarow_labels)
                .enter()
                .append('text')
                .attr('text-anchor', 'start')
                .attr('alignment-baseline', 'middle')
                .text((d) => d)
                .attr('dy', (_, i) => (i == 0 ? 5 : 25))
                .attr('dx', 8);
        }

        if (data_point !== undefined) {
            svg.append('g')
                .attr('transform', function (d) {
                    return 'translate(0,-10)';
                })
                .append('polygon')
                .attr('points', function () {
                    return (
                        x(data_point + bar_width / 2) -
                        4 +
                        ',0 ' +
                        (x(data_point + bar_width / 2) + 4) +
                        ',0 ' +
                        x(data_point + bar_width / 2) +
                        ',8'
                    );
                });
        }
    }

    render() {
        return (
            <div ref={this.spacesRef}>
                <p style={{ color: 'grey', padding: '10px' }}>
                    Run the environment benchmark to collect & visualize data
                </p>
            </div>
        );
    }
}
