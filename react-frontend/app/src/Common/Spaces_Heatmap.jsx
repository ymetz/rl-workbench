import React, { Component } from 'react';
import * as d3 from 'd3';

/***
 * Renders a heatmap based on a single 2D-array, so heatmap data should be provided.
 */
export default class spaces_heatmap extends Component {
    constructor(props) {
        super(props);
        this.heatmapRef = React.createRef();
    }

    componentDidMount() {
        //if (this.props.heatmapData.length > 0)
        //    this.drawChart(this.props.heatmapData, this.props.secondaryData, this.props.lowHigh, this.props.dim, this.props.dataSteps);
    }

    componentDidUpdate() {
        //if (this.props.heatmapData.length > 0)
        //    this.drawChart(this.props.heatmapData, this.props.stepData, this.props.lowHigh, this.props.dim, this.props.dataSteps);
    }

    drawChart(heatmap_data, step_data, lowHigh, dim, dataSteps) {
        const margin = { top: 10, right: 10, bottom: 30, left: 50 };
        const svgWidth = 225 - margin.left - margin.right;
        const svgHeight = 250 - margin.top - margin.bottom;

        d3.select(this.heatmapRef.current.current).select('*').remove();

        const svg = d3
            .select(this.heatmapRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const y = d3.scaleBand().range([svgHeight, 0]).domain([0, heatmap_data.length]);
        svg.append('g').call(d3.axisLeft(y));

        const x = d3.scaleBand().range([0, svgWidth]).domain([0, heatmap_data[0].length]);
        svg.append('g')
            .attr('transform', 'translate(0,' + svgHeight + ')')
            .call(d3.axisBottom(x));

        function getColor(value, max, min) {
            if (min < 0 && max > 0) return d3.interpolateRdYlBu(1.0 - normalize(value, max, min));
            else return d3.interpolateYlOrRd(normalize(value, max, min));
        }

        svg.selectAll('g')
            .data(heatmap_data)
            .enter()
            .append('g')
            .each(function (data_row, row_idx) {
                d3.select(this)
                    .selectAll('rect')
                    .data(data_row)
                    .enter()
                    .append('rect')
                    .attr('x', (d, i) => x(i))
                    .attr('y', y(row_idx))
                    .attr('width', x.bandwidth())
                    .attr('height', y.bandwidth())
                    .style('fill', (d) => {
                        return '#ff0000';
                    });
            });
    }

    render() {
        return (
            <div ref={this.heatmapRef}>
                <p style={{ marginLeft: '10px', textAlign: 'center', color: '#6c757d' }}>
                    Visualization currently not supported for image input
                </p>
            </div>
        );
    }
}
