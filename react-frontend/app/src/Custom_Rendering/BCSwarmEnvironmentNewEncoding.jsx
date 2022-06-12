import React, { Component } from 'react';
import * as d3 from 'd3';

/***
 * Renders a custom rendering of the BC Swarm Environment.
 */
export default class BCSwarmEnvironment extends Component {
    constructor(props) {
        super(props);
        this.viz_ref = React.createRef();

        this.state = {
            data_timestamp: 0,
            dims: {
                x_min: -10,
                x_max: 10,
                y_min: -10,
                y_max: 10,
            },
            zoom_factor: 1.0,
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps !== this.props) return true;
        return false;
    }

    componentDidMount() {
        if (this.props.renderData.length > 0) {
            const mean_x = d3.median(this.props.renderData.map((d) => d[0]));
            const mean_y = d3.median(this.props.renderData.map((d) => d[1]));

            this.setState({ data_timestamp: this.props.dataTimestamp, dims: this.props.renderDims }, () => {
                this.drawChart(this.props.renderDims, { x: mean_x, y: mean_y });
                this.updateData(this.props.renderData, this.props.secRenderData, { x: mean_x, y: mean_y });
            });
        }
    }

    componentDidUpdate() {
        if (this.props.renderData.length > 0) {
            if (this.props.dataTimestamp !== this.state.data_timestamp) {
                this.setState({ data_timestamp: this.props.dataTimestamp }, () => {
                    const mean_x = d3.median(this.props.renderData.map((d) => d[0]));
                    const mean_y = d3.median(this.props.renderData.map((d) => d[1]));
                    this.drawChart(this.props.renderDims, { x: mean_x, y: mean_y });
                    this.updateData(this.props.renderData, this.props.secRenderData, { x: mean_x, y: mean_y });
                });
            } else {
                this.updateData(this.props.renderData, this.props.secRenderData);
            }
        }
    }

    updateData(newData, newSecondaryData, means) {
        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const svgWidth = this.viz_ref.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = 500 - margin.top - margin.bottom;
        const view = d3.select(this.viz_ref.current).select('#view');
        view.selectAll('.data_group').remove();

        let dims;
        if (means !== undefined) {
            dims = { x_min: means.x - 2.5, x_max: means.x + 2.5, y_min: means.y - 2.5, y_max: means.y + 2.5 };
        } else {
            dims = this.state.dims;
        }
        const xScale = d3.scaleLinear().range([0, svgWidth]).domain([dims.x_min, dims.x_max]);
        const yScale = d3.scaleLinear().range([svgHeight, 0]).domain([dims.y_min, dims.y_max]);
        const current_zoom_factor = this.state.zoom_factor;

        newData.concat(newSecondaryData).forEach((p, i) => {
            // p[0]: x, p[1]: y, p[2]: cos angle, p[3]: sin angle,s p[3]: speed
            const tail_length = p[4] * 2; // 50 means length is propotial to covered distance per sec.
            const tail_endpoint = [p[2] * tail_length, p[3] * tail_length];

            const data_point = view.append('g').attr('class', 'data_group');

            function getColor(index, dataLength) {
                if (index == 0) {
                    return 'red';
                } else if (index < dataLength) {
                    return 'blue';
                } else {
                    return '#979797';
                }
            }

            data_point
                .append('path')
                .attr(
                    'd',
                    'M' +
                        xScale(0) +
                        ' ' +
                        yScale(0) +
                        ' L' +
                        xScale(-tail_endpoint[0]) +
                        ' ' +
                        yScale(-tail_endpoint[1])
                )
                .attr('stroke', getColor(i, newData.length))
                .attr('stroke-width', 1.0 / current_zoom_factor)
                .attr('fill', 'none')
                .attr('transform', 'translate(' + (xScale(p[0]) - xScale(0)) + ',' + (yScale(p[1]) - yScale(0)) + ')')
                .style('opacity', 0.8);

            data_point
                .append('circle')
                .attr('r', 2.5 / current_zoom_factor)
                .attr('fill', getColor(i, newData.length))
                .attr('stroke', 'black')
                .attr('stroke-width', 0.2 / current_zoom_factor)
                .attr('cx', xScale(p[0]))
                .attr('cy', yScale(p[1]));

            if (i == 0) {
                const nr_of_neighbors = Math.trunc((p.length - 5) / 5);
                const end_point_list = [];
                for (let j = 0; j < nr_of_neighbors; j++) {
                    const n_tail_length = p[5 + j * 5];
                    const n_tail_endpoint = [p[5 + j * 5 + 1] * n_tail_length, p[5 + j * 5 + 2] * n_tail_length];
                    end_point_list.push(n_tail_endpoint);
                }

                data_point
                    .selectAll('.nn_path')
                    .data(end_point_list)
                    .enter()
                    .append('path')
                    .attr('class', 'nn_path')
                    .attr('stroke', 'orange')
                    .attr('stroke-width', (d) => {
                        console.log(d);
                        return 0.5 / current_zoom_factor;
                    })
                    .attr(
                        'd',
                        (d) =>
                            'M' +
                            xScale(p[0]) +
                            ' ' +
                            yScale(p[1]) +
                            'L' +
                            xScale(p[0] + d[0]) +
                            ' ' +
                            yScale(p[1] + d[1])
                    );
            }
        });
    }

    drawChart(dims, means) {
        const _self = this;

        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const svgWidth = this.viz_ref.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = 250 - margin.top - margin.bottom;

        d3.select(this.viz_ref.current).select('*').remove();

        const svg = d3.select(this.viz_ref.current).append('svg').attr('viewBox', [0, 0, svgWidth, svgHeight]);

        const svgG = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const xScale = d3
            .scaleLinear()
            .range([0, svgWidth])
            .domain([means.x - 2.5, means.x + 2.5]);
        const yScale = d3
            .scaleLinear()
            .range([svgHeight, 0])
            .domain([means.y - 2.5, means.y + 2.5]);

        const xAxis = d3
            .axisBottom(xScale)
            .ticks(((svgWidth + 2) / (svgHeight + 2)) * 5)
            .tickSize(svgHeight)
            .tickPadding(8 - svgHeight);

        const yAxis = d3
            .axisRight(yScale)
            .ticks(5)
            .tickSize(svgWidth)
            .tickPadding(8 - svgWidth);

        const zoom = d3.zoom().scaleExtent([0.1, 50]).on('zoom', zoomed).on('end', saveZoom);

        const gX = svgG.append('g').attr('class', 'axis-embed axis--x').call(xAxis);

        const gY = svgG.append('g').attr('class', 'axis-embed axis--y').call(yAxis);

        const view = svgG.append('g').attr('id', 'view');

        view.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', svgHeight)
            .attr('width', svgWidth)
            .style('opacity', '0');

        svg.call(zoom);
        saveZoom();

        function zoomed(event) {
            view.attr('transform', event.transform);
            view.selectAll('circle')
                .attr('r', 2.5 / event.transform.k)
                .attr('stroke-width', 0.2 / event.transform.k);
            view.selectAll('path').attr('stroke-width', 1.0 / event.transform.k);
            gX.call(xAxis.scale(event.transform.rescaleX(xScale)));
            gY.call(yAxis.scale(event.transform.rescaleY(yScale)));
        }

        function saveZoom() {
            const zoom_factor = event !== null && event.transform !== undefined ? event.transform.k : 1.0;
            _self.setState({
                dims: {
                    x_min: xScale.domain()[0],
                    x_max: xScale.domain()[1],
                    y_min: yScale.domain()[0],
                    y_max: yScale.domain()[1],
                },
                zoom_factor: zoom_factor,
            });
        }
    }

    render() {
        return (
            <div ref={this.viz_ref}>
                <p style={{ color: 'grey', padding: '10px' }}>
                    Run the environment benchmark to collect & visualize data
                </p>
            </div>
        );
    }
}
