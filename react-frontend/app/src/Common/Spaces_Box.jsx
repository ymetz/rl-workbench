import React, { Component } from 'react';
import * as d3 from 'd3';
import { legend } from './Color_Legend';

function normalize(val, max, min) {
    return (val - min) / (max - min);
}

export default class spaces_box extends Component {
    constructor(props) {
        super(props);
        this.spaceBoxRef = React.createRef();
    }

    componentDidMount() {
        if (this.props.data.length > 0 && this.props.data.length === this.props.spaceInfo.shape[0])
            this.drawChart(
                this.props.data,
                this.props.attrData,
                this.props.spaceInfo,
                this.props.width,
                this.props.isAttribution
            );
    }

    componentDidUpdate() {
        if (this.props.data.length > 0 && this.props.data.length === this.props.spaceInfo.shape[0])
            this.drawChart(
                this.props.data,
                this.props.attrData,
                this.props.spaceInfo,
                this.props.width,
                this.props.isAttribution
            );
    }

    drawChart(data, attrData, spaceInfo, width, isAttribution) {
        const is_1d_vector = Array.isArray(this.props.data[0]) ? false : true;
        const extra_y_margin = !is_1d_vector ? 25 : 0;

        const margin = { top: 10, right: 10, bottom: 30, left: 15 };
        const svgWidth =
            (width !== undefined ? width : this.spaceBoxRef.current.parentElement.clientWidth) -
            margin.left -
            margin.right -
            extra_y_margin;
        const svgHeight = 100 - margin.top - margin.bottom;
        const has_attr_data = attrData !== undefined;

        d3.select(this.spaceBoxRef.current.current).selectAll('*').remove();

        const nr_of_elements_per_row = 11;
        for (let slice_idx = 0; slice_idx < data.length; slice_idx = slice_idx + nr_of_elements_per_row) {
            const slice_data = data.slice(slice_idx, slice_idx + nr_of_elements_per_row);
            const slice_attr_data = has_attr_data
                ? attrData.slice(slice_idx, slice_idx + nr_of_elements_per_row)
                : undefined;
            const scaled_svg_width = (slice_data.length / nr_of_elements_per_row) * svgWidth;
            const scaled_vertical_margin = (svgWidth - scaled_svg_width) / 2;

            const svg = d3
                .select(this.spaceBoxRef.current.current)
                .append('svg')
                .attr('width', svgWidth + margin.left + extra_y_margin + margin.right)
                .attr('height', svgHeight + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + (margin.left + extra_y_margin) + ',' + margin.top + ')');

            function getColor(value, max, min, isAttribution) {
                if (isAttribution) console.log(min, max);
                if (min < 0 && max > 0) {
                    if (!isAttribution) return d3.interpolateRdYlGn(normalize(value, max, min));
                    else return d3.interpolateYlGnBu(normalize(value, max, min));
                } else {
                    if (!isAttribution) return d3.interpolateYlOrRd(normalize(value, max, min));
                    else return d3.interpolateYlGn(normalize(value, max, min));
                }
            }

            if (is_1d_vector) {
                const domains = [];
                const vars = [];
                if (spaceInfo.dimensions && spaceInfo.dimensions.length == 1) {
                    //1D Data e.g. feature vector
                    // One heatmap cell for each value in feature vector
                    for (let d_idx = 0; d_idx < slice_data.length; d_idx++) {
                        domains.push(spaceInfo['tag_' + (d_idx + slice_idx).toString()]);
                    }
                    vars.push(0);
                }

                const x = d3
                    .scaleBand()
                    .range([scaled_vertical_margin, scaled_svg_width + scaled_vertical_margin])
                    .domain(domains)
                    .padding(0.01);

                svg.append('g')
                    .attr('transform', 'translate(0,' + svgHeight + ')')
                    .call(d3.axisBottom(x));

                svg.selectAll('.tick line').attr('y2', function (d) {
                    if (d % 200) return 10;
                    else return 4;
                });

                const y = d3.scaleBand().range([svgHeight, 0]).domain(vars).padding(0.01);

                const valueGroups = svg.selectAll().data(slice_data).enter().append('g');

                let attrGroup;
                if (has_attr_data) {
                    attrGroup = svg.selectAll().data(slice_attr_data).enter().append('g');
                }

                valueGroups
                    .append('rect')
                    .attr('x', function (d, i) {
                        return x(domains[i]);
                    })
                    .attr('y', function (d, i) {
                        return y(0);
                    })
                    .attr('width', x.bandwidth())
                    .attr('height', () => (has_attr_data ? y.bandwidth() / 2 : y.bandwidth()))
                    .style('fill', function (d, i) {
                        return getColor(d, spaceInfo.high[i + slice_idx], spaceInfo.low[i + slice_idx]);
                    });

                valueGroups
                    .append('text')
                    .attr('x', function (d, i) {
                        return x(domains[i]) + 0.5 * x.bandwidth();
                    })
                    .attr('y', function (d, i) {
                        return y(0) + 0.5 * y.bandwidth();
                    })
                    .text(function (d) {
                        return d.toFixed(2);
                    })
                    .style('text-anchor', 'middle');

                if (has_attr_data) {
                    attrGroup
                        .append('rect')
                        .attr('x', function (d, i) {
                            return x(domains[i]);
                        })
                        .attr('y', function (d, i) {
                            return y(0) + 0.5 * y.bandwidth();
                        })
                        .attr('width', x.bandwidth())
                        .attr('height', y.bandwidth() / 2)
                        .style('fill', function (d, i) {
                            return getColor(
                                d,
                                spaceInfo.high[i + slice_idx],
                                spaceInfo.low[i + slice_idx],
                                isAttribution
                            );
                        });

                    attrGroup
                        .append('text')
                        .attr('x', function (d, i) {
                            return x(domains[i]) + 0.5 * x.bandwidth();
                        })
                        .attr('y', function (d, i) {
                            return y(0) + 0.75 * y.bandwidth();
                        })
                        .text(function (d) {
                            return '(' + d.toFixed(2) + ')';
                        })
                        .style('text-anchor', 'middle');
                }
            } else {
                //Assume a 2d vector, as 3d vectors are directly displayed as images
                const domains = [];
                const vars = [];
                // Determine domains and values for a single entry from the 2d vector and match with names
                for (let d_idx = 0; d_idx < slice_data[0].length; d_idx++) {
                    domains.push(spaceInfo['tag_' + d_idx.toString()]);
                }

                const y = d3.scaleBand().range([0, svgHeight]).domain(domains).padding(0.01);

                svg.append('g').call(d3.axisLeft(y));

                const custom_ticks = ['NN10', 'NN9', 'NN8', 'NN7', 'NN6', 'NN5', 'NN4', 'NN3', 'NN2', 'NN1', 'Focal'];
                const x = d3
                    .scaleBand()
                    .range([0, svgWidth])
                    .domain(Array.from({ length: slice_data.length }, (x, i) => i));
                svg.append('g')
                    .attr('transform', 'translate(0,' + svgHeight + ')')
                    .call(d3.axisBottom(x).tickFormat((e, i) => custom_ticks[i]));

                const column_g = svg
                    .selectAll('.column_g')
                    .data(slice_data)
                    .enter()
                    .append('g')
                    .attr('class', 'column_g');
                column_g.each(function (data_col, col_idx) {
                    d3.select(this)
                        .selectAll('rect')
                        .data(data_col)
                        .enter()
                        .append('rect')
                        .attr('class', '2d_column_rect')
                        .attr('x', () => {
                            return x(col_idx);
                        })
                        .attr('y', (d, i) => y(domains[i]))
                        .attr('width', x.bandwidth())
                        .attr('height', y.bandwidth())
                        .style('fill', function (d, i) {
                            return getColor(d, spaceInfo.high[slice_idx][i], spaceInfo.low[slice_idx][i]);
                        });
                });

                column_g.each(function (data_col, col_idx) {
                    d3.select(this)
                        .selectAll('.v_text')
                        .data(data_col)
                        .enter()
                        .append('text')
                        .attr('class', 'v_text')
                        .attr('x', function () {
                            return x(col_idx) + 0.5 * x.bandwidth();
                        })
                        .attr('y', function (d, i) {
                            return y(domains[i]) + y.bandwidth();
                        })
                        .text(function (d) {
                            return d.toFixed(2);
                        })
                        .attr('font_size', 'smaller')
                        .style('text-anchor', 'middle');
                });
            }
        }

        let color_scale;
        if (is_1d_vector) {
            color_scale =
                Array.isArray(spaceInfo.low) && spaceInfo.low.some((d) => d < 0)
                    ? d3.scaleSequential([-1, 1], (i) => d3.interpolateRdYlGn(i))
                    : d3.scaleSequential([-1, 1], d3.interpolateYlGnBu);
        } else {
            color_scale =
                Array.isArray(spaceInfo.low[0]) && spaceInfo.low[0].some((d) => d < 0)
                    ? d3.scaleSequential([-1, 1], (i) => d3.interpolateRdYlGn(i))
                    : d3.scaleSequential([-1, 1], d3.interpolateYlGnBu);
        }
        const the_legend = legend({
            color: color_scale,
            title: 'Value Color Scale (each dimension has its own value range)',
            width: svgWidth,
            tickFormat: '+%',
        });

        d3.select(this.spaceBoxRef.current.current).node().appendChild(the_legend);
    }

    render() {
        return (
            <div ref={this.spaceBoxRef}>
                <p style={{ color: 'grey', padding: '10px' }}>
                    Run the environment benchmark to collect & visualize data
                </p>
            </div>
        );
    }
}
