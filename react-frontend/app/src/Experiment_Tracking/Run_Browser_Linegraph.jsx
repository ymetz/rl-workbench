import React, { Component } from 'react';
import * as d3 from 'd3';
import '../css/Run_Browser.module.css';

export default class run_browser_linegraph extends Component {
    constructor(props) {
        super(props);
        this.linegraphRef = React.createRef();
    }

    componentDidMount() {
        if (this.props.data.length > 0) {
            this.drawChart(
                this.props.data,
                this.props.getCallbackData,
                this.props.callbackFrequencies,
                this.props.highlightedRows,
                this.props.indexMap,
                this.props.combinedRows
            );
        }
    }

    componentDidUpdate() {
        if (this.props.data.length > 0) {
            this.drawChart(
                this.props.data,
                this.props.getCallbackData,
                this.props.callbackFrequencies,
                this.props.highlightedRows,
                this.props.indexMap,
                this.props.combinedRows
            );
        }
    }

    combineArrays(arrays) {
        const processed_data = [];
        const value_interval_data = [];
        const mean_array = [];
        // Last element of each array contains the maximum step
        const min_steps = arrays.map((arr) => arr[0][0]);
        const max_steps = arrays.map((arr) => arr[arr.length - 1][0]);
        // For 512 intermediate values, determine the mean, max and min value for the combined data arrays
        const step_size = Math.floor(d3.max(max_steps) / 512);
        for (let i = step_size; i < d3.max(max_steps) - step_size; i += step_size) {
            if (i < d3.min(min_steps)) continue;
            const bisect_values = arrays
                .filter((d, arr_idx) => i > min_steps[arr_idx] && i < max_steps[arr_idx])
                .map((arr) => {
                    const insertPoint = d3.bisectRight(
                        arr.map((elem) => elem[0]),
                        i
                    );
                    return [arr[insertPoint - 1], arr[insertPoint]];
                });
            const interpolated_values = bisect_values.map((bav) => {
                const norm_f = bav[0][0] === bav[1][0] ? 0 : (i - bav[0][0]) / (bav[1][0] - bav[0][0]);
                return bav[0][1] * (1 - norm_f) + bav[1][1] * norm_f;
            });
            mean_array.push([i, d3.mean(interpolated_values)]);
            value_interval_data.push([i, ...d3.extent(interpolated_values)]);
        }
        processed_data.push(mean_array);

        return {
            combined_rows_data: processed_data,
            combined_interval_data: value_interval_data,
        };
    }

    drawChart(data, getCallbackData, callbackFrequencies, highlightedRows, indexMap, combinedRows) {
        const margin = { top: 30, right: 20, bottom: 20, left: 20 };
        const svgWidth = this.linegraphRef.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = 500 - margin.top - margin.bottom;

        // Pre-Process data, create combined data row with value interval data
        let value_interval_data = [];
        if (combinedRows.length > 0) {
            let unprocessed_rows = [];
            const unprocessed_index_map = [];
            // Keep single rows and rewrite indexMap, combined run pushed to the back of the array
            unprocessed_rows = data.filter((data_row, i) => {
                if (!combinedRows.includes(indexMap[i])) {
                    unprocessed_index_map.push(indexMap[i]);
                    return true;
                } else {
                    return false;
                }
            });

            const { combined_rows_data, combined_interval_data } = this.combineArrays(
                data.filter((data_row, i) => combinedRows.includes(indexMap[i])),
                combinedRows
            );

            data = [...unprocessed_rows, ...combined_rows_data];
            indexMap = combinedRows.length > 0 ? [...unprocessed_index_map, combinedRows[0]] : unprocessed_index_map;
            value_interval_data = combined_interval_data;
        }

        const num_of_data_rows = data.length;
        const max_x_value = d3.max(data.map((d) => (d.length > 0 ? d[d.length - 1][0] : 0)));
        const has_extra_data_column = data.map((d) => d.length > 1 && d[0].length > 3); // An extra data column corresponds to an addiontal Evaluation Loss Value, e.g. for imiation learning
        let y_bounds;
        if (value_interval_data.length > 0) {
            y_bounds = {
                min: d3.min(value_interval_data.map((v) => v[1])),
                max: d3.max(value_interval_data.map((v) => v[1])),
            };
        } else {
            y_bounds = {
                min: d3.min(
                    data.map((d, i) =>
                        has_extra_data_column[i]
                            ? d3.min(d.map((v) => d3.min([v[1], v[3]])))
                            : d3.min(d.map((v) => v[1]))
                    )
                ),
                max: d3.max(
                    data.map((d, i) =>
                        has_extra_data_column[i]
                            ? d3.max(d.map((v) => d3.max([v[1], v[3]])))
                            : d3.max(d.map((v) => v[1]))
                    )
                ),
            };
        }
        const colors = d3.scaleOrdinal(d3.schemeTableau10).domain(Array.from({ length: 10 }, (x, i) => i));
        const num_of_colors = 10;

        d3.select(this.linegraphRef.current.current).select('*').remove();

        const svg = d3
            .select(this.linegraphRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const brush = d3
            .brush()
            .extent([
                [0, 0],
                [svgWidth, svgHeight],
            ])
            .on('end', updateChart);

        const x = d3.scaleLinear().domain([0, max_x_value]).range([0, svgWidth]);

        const xAxis = svg
            .append('g')
            .attr('transform', 'translate(0,' + svgHeight + ')')
            .attr('class', 'grayAxis')
            .call(d3.axisBottom(x).tickSize(-svgHeight))
            .call((g) => g.selectAll('.tick line').attr('stroke-opacity', 0.3))
            .call((g) => g.selectAll('.tick text').attr('font-size', '11px'));

        const y = d3.scaleLinear().range([svgHeight, 0]).domain([y_bounds.min, y_bounds.max]);

        const yAxis = svg
            .append('g')
            .attr('class', 'grayAxis')
            .call(d3.axisRight(y).tickSize(svgWidth))
            .call((g) => g.select('.domain').remove())
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .filter(function (d) {
                        return d != 0;
                    })
                    .attr('stroke-opacity', 0.3)
            )
            .call((g) =>
                g
                    .selectAll('.tick line')
                    .filter(function (d) {
                        return d == 0;
                    })
                    .attr('stroke-opacity', 0.65)
            )
            .call((g) => g.selectAll('.tick text').attr('x', 4).attr('dy', -4).attr('font-size', '11px'));

        // Clipping
        svg.append('defs')
            .append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', svgWidth)
            .attr('height', svgHeight);

        const main = svg.append('g').attr('class', 'main').attr('clip-path', 'url(#clip)');

        // Draw value interval if data is available
        let value_interval;
        if (value_interval_data.length > 0) {
            value_interval = main
                .append('path')
                .datum(value_interval_data)
                .attr('fill', colors(indexMap[indexMap.length - 1] % num_of_colors))
                .attr('stroke', 'none')
                .style('opacity', '0.5')
                .attr(
                    'd',
                    d3
                        .area()
                        .x((d, i) => x(d[0]))
                        .y0((d) => y(d[1]))
                        .y1((d) => y(d[2]))
                );
        }

        const linegraphs = main
            .selectAll('.line')
            .data(data)
            .enter()
            .append('path')
            .attr('class', function (d, i) {
                return 'line_' + i + ' line-datarow';
            })
            .attr('fill', 'none')
            .attr('stroke', function (d, i) {
                return colors(indexMap[i] % num_of_colors);
            })
            .attr('stroke-width', 2)
            .attr(
                'd',
                d3
                    .line()
                    .x(function (d) {
                        return x(d[0]);
                    })
                    .y(function (d) {
                        return y(d[1]);
                    })
            );

        linegraphs
            .filter((_, i) => has_extra_data_column[i])
            .attr('stroke-width', 1.8)
            .attr('opacity', 0.5);

        const eventual_linegraphs = main
            .selectAll('.eventual_line')
            .data(data.filter((_, i) => has_extra_data_column[i]))
            .enter()
            .append('path')
            .attr('class', function (d, i) {
                return 'eventual_line line_' + i + ' line-datarow';
            })
            .attr('fill', 'none')
            .attr('stroke', function (d, i) {
                return colors(indexMap.filter((_, i) => has_extra_data_column[i])[i] % num_of_colors);
            })
            .attr('stroke-width', 2)

            .attr(
                'd',
                d3
                    .line()
                    .x(function (d) {
                        return x(d[0]);
                    })
                    .y(function (d) {
                        return y(d[3]);
                    })
            );

        linegraphs
            .filter((d, i) => highlightedRows.includes(indexMap[i]))
            .attr('stroke-width', 3.5)
            .raise();
        eventual_linegraphs
            .filter((d, i) => highlightedRows.includes(indexMap[i]))
            .attr('stroke-width', 3.5)
            .raise();

        const brush_g = svg.append('g').attr('class', 'brush').call(brush);

        const callbackPoints = svg
            .selectAll(null)
            .data(data)
            .enter()
            .append('g')
            .selectAll('circle')
            .data(function (d, d_idx) {
                return d3
                    .range(
                        callbackFrequencies[d_idx],
                        d.length > 0 ? d[d.length - 1][0] : 0,
                        callbackFrequencies[d_idx]
                    )
                    .map((e) => {
                        return [
                            e,
                            d[
                                d3.bisectRight(
                                    d.map((dp) => dp[0]),
                                    e
                                )
                            ],
                            d_idx,
                        ];
                    });
            })
            .enter()
            .append('circle')
            .attr('cx', function (d) {
                return x(d[1][0]);
            })
            .attr('cy', function (d) {
                return y(d[1][1]);
            })
            .attr('r', 7)
            .attr('stroke', function (d) {
                return colors(indexMap[d[2]] % num_of_colors);
            })
            .attr('stroke-width', '2')
            .attr('fill', 'white')
            .attr('pointer-events', 'all')
            .style('cursor', 'pointer')
            .on('click', circleClick);

        const focus_g = svg.append('g').style('display', 'none');

        const focus_text_g = focus_g.append('g').attr('transform', 'translate(35,10)');

        const focus_markers = focus_g
            .selectAll('.primary_circles')
            .data(function () {
                return Array.from({ length: num_of_data_rows }, (x, i) => i);
            })
            .enter()
            .append('circle')
            .attr('class', 'primary_circles')
            .attr('r', 5)
            .attr('fill', (d) => colors(indexMap[d] % num_of_colors));

        const eventual_focus_markers = focus_g
            .selectAll('.second_circle')
            .data(function () {
                return Array.from({ length: num_of_data_rows }, (x, i) => i);
            })
            .enter()
            .append('circle')
            .attr('class', 'second_circle')
            .attr('r', 5)
            .attr('fill', (d) => colors(indexMap[d] % num_of_colors));

        const focus_rect = focus_text_g
            .append('rect')
            .attr('width', 350)
            .attr('height', () => {
                return num_of_data_rows * 20;
            })
            .attr('x', -5)
            .attr('y', -20)
            .attr('fill', '#343a40')
            .style('opacity', 0.7)
            .style('pointer-events', 'none');

        const focus_text = focus_text_g
            .append('text')
            .attr('text-anchor', 'start')
            .attr('alignment-baseline', 'middle');

        brush_g
            .select('.overlay')
            .on('mouseover', function () {
                focus_g.style('display', null);
            })
            .on('mouseout', function () {
                focus_g.style('display', 'none');
            })
            .on('mousemove', mousemove);

        function mousemove() {
            const mouse_pos = d3.pointer(this);
            const x0 = data.map((dr) =>
                d3.bisectRight(
                    dr.map((d) => d[0]),
                    Math.round(x.invert(mouse_pos[0]))
                )
            );
            if (x0[0] === undefined) return;
            const selectedData = data.map((d, i) => d[x0[i]]);
            focus_text.selectAll('tspan').remove();
            focus_g.selectAll('.text-circle').remove();
            let num_of_displayed_rows = 0;
            x0.forEach((x0_di, i) => {
                if (selectedData[i] !== undefined) {
                    focus_text
                        .append('tspan')
                        .text(
                            'Episode: ' +
                                x0_di +
                                (selectedData[i].length <= 3
                                    ? ' Ep.Reward: ' + selectedData[i][1].toFixed(2)
                                    : ' Train. Loss' +
                                      selectedData[i][1].toFixed(2) +
                                      ' Eval. Loss: ' +
                                      selectedData[i][3].toFixed(2))
                        )
                        .attr('x', 15)
                        .attr('dy', function () {
                            return num_of_displayed_rows == 0 ? 0 : 20;
                        })
                        .attr('fill', '#dedede');

                    focus_text_g
                        .append('circle')
                        .attr('class', 'text-circle')
                        .attr('cx', 5)
                        .attr('cy', 20 * num_of_displayed_rows - 6)
                        .attr('r', 7)
                        .attr('fill', colors(indexMap[i] % num_of_colors))
                        .attr('stroke', '#dedede')
                        .attr('stroke-width', 1);

                    num_of_displayed_rows++;
                }
            });
            focus_rect.attr('height', () => {
                return num_of_displayed_rows * 25;
            });
            focus_markers.attr('transform', (d, i) =>
                selectedData[i] !== undefined
                    ? 'translate(' + x(selectedData[i][0]) + ',' + y(selectedData[i][1]) + ')'
                    : 'none'
            );
            eventual_focus_markers.attr('transform', (d, i) =>
                selectedData[i] !== undefined
                    ? 'translate(' + x(selectedData[i][0]) + ',' + y(selectedData[i][3]) + ')'
                    : 'none'
            );
        }

        function circleClick(d) {
            getCallbackData(d[2], d[0]);
        }

        let idleTimeout;
        function idled() {
            idleTimeout = null;
        }

        function updateChart(event) {
            const extent = event.selection;

            if (!extent) {
                if (!idleTimeout) return (idleTimeout = setTimeout(idled, 250));
                x.domain([0, max_x_value]);
                y.domain([y_bounds.min, y_bounds.max]);
            } else {
                x.domain([x.invert(extent[0][0]), x.invert(extent[1][0])]);
                y.domain([y.invert(extent[1][1]), y.invert(extent[0][1])]);
                svg.select('.brush').call(brush.move, null);
            }

            xAxis.transition(1000).call(d3.axisBottom(x).tickSize(-svgHeight));
            yAxis
                .transition(1000)
                .call(d3.axisRight(y).tickSize(svgWidth))
                .call((g) => g.select('.domain').remove())
                .call((g) =>
                    g
                        .selectAll('.tick line')
                        .filter(function (d) {
                            return d != 0;
                        })
                        .attr('stroke-opacity', 0.5)
                )
                .call((g) =>
                    g
                        .selectAll('.tick line')
                        .filter(function (d) {
                            return d == 0;
                        })
                        .attr('stroke-opacity', 0.65)
                )
                .call((g) => g.selectAll('.tick text').attr('x', 4).attr('font-size', '11px'));

            linegraphs.transition(1000).attr(
                'd',
                d3
                    .line()
                    .x(function (d) {
                        return x(d[0]);
                    })
                    .y(function (d) {
                        return y(d[1]);
                    })
            );

            eventual_linegraphs.transition(1000).attr(
                'd',
                d3
                    .line()
                    .x(function (d) {
                        return x(d[0]);
                    })
                    .y(function (d) {
                        return y(d[3]);
                    })
            );

            if (value_interval !== undefined) {
                value_interval.transition(1000).attr(
                    'd',
                    d3
                        .area()
                        .x((d, i) => x(d[0]))
                        .y0((d) => y(d[1]))
                        .y1((d) => y(d[2]))
                );
            }

            callbackPoints
                .transition(1000)
                .attr('cx', function (d) {
                    return x(d[1][0]);
                })
                .attr('cy', function (d) {
                    return y(d[1][1]);
                });
        }
    }

    render() {
        return <div ref={this.linegraphRef}></div>;
    }
}
