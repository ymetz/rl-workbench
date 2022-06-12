import React, { Component } from 'react';
import * as d3 from 'd3';

function normalize(val, max, min) {
    return (val - min) / (max - min);
}

export default class spaces_parallel_histogram extends Component {
    constructor(props) {
        super(props);
        this.parallelRef = React.createRef();
    }

    componentDidMount() {
        if (this.props.data.length > 0 && this.props.data.length === this.props.spaceInfo.shape[0])
            this.drawChart(
                this.props.data,
                this.props.attrData,
                this.props.spaceInfo,
                this.props.width,
                this.props.isAttribution,
                this.props.lineColor
            );
    }

    componentDidUpdate() {
        if (this.props.data.length > 0 && this.props.data.length === this.props.spaceInfo.shape[0])
            this.drawChart(
                this.props.data,
                this.props.attrData,
                this.props.spaceInfo,
                this.props.width,
                this.props.isAttribution,
                this.props.lineColor
            );
    }

    drawChart(data, attrData, spaceInfo, width, isAttribution, lineColor) {
        const is_1d_vector = Array.isArray(this.props.data[0]) ? false : true;
        const extra_y_margin = !is_1d_vector ? 25 : 0;

        const margin = { top: 25, right: 5, bottom: 30, left: 20 };
        const svgWidth =
            (width !== undefined ? width : this.parallelRef.current.parentElement.clientWidth) -
            margin.left -
            margin.right -
            extra_y_margin;
        const svgHeight = 150 - margin.top - margin.bottom;
        const has_attr_data = attrData !== undefined;

        d3.select(this.parallelRef.current.current).selectAll('*').remove();

        const nr_of_elements_per_row = 11;
        for (let slice_idx = 0; slice_idx < data.length; slice_idx = slice_idx + nr_of_elements_per_row) {
            const slice_data = data.slice(slice_idx, slice_idx + nr_of_elements_per_row);
            // const slice_attr_data = (has_attr_data) ? attrData.slice(slice_idx, slice_idx + nr_of_elements_per_row) : undefined;
            const scaled_svg_width = (slice_data.length / nr_of_elements_per_row) * svgWidth;
            const scaled_vertical_margin = (svgWidth - scaled_svg_width) / 2;

            const svg = d3
                .select(this.parallelRef.current.current)
                .append('svg')
                .attr('width', svgWidth + margin.left + extra_y_margin + margin.right)
                .attr('height', svgHeight + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + (margin.left + extra_y_margin) + ',' + margin.top + ')');

            function getColor(value, max, min, isAttribution) {
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
                }

                const x = d3
                    .scalePoint()
                    .range([scaled_vertical_margin, scaled_svg_width + scaled_vertical_margin])
                    .domain(domains)
                    .padding(0.01);

                const y = {};
                for (const i in domains) {
                    name = domains[i];
                    y[name] = d3
                        .scaleLinear()
                        .domain([spaceInfo.low[new Number(i) + slice_idx], spaceInfo.high[new Number(i) + slice_idx]]) // --> Same axis range for each group
                        // --> different axis range for each group --> .domain( [d3.extent(data, function(d) { return +d[name]; })] )
                        .range([svgHeight, 10]);
                }

                const valueGroups = svg.append('g');

                let attrGroup;
                if (has_attr_data) {
                    attrGroup = svg.append('g');
                }

                function path(d) {
                    return d3.line()(
                        domains.map(function (p, i) {
                            return [x(p), y[p](d[i])];
                        })
                    );
                }

                valueGroups
                    .selectAll('.line')
                    .data([slice_data])
                    .enter()
                    .append('path')
                    .attr('class', function (d, i) {
                        return 'line ' + i;
                    }) // 2 class for each line: 'line' and the group name
                    .attr('d', path)
                    .style('fill', 'none')
                    .attr('stroke', lineColor)
                    .attr('stroke-width', 1.5)
                    .style('opacity', 1.0);

                // Draw the axis:
                valueGroups
                    .selectAll('myAxis')
                    .data(domains)
                    .enter()
                    .append('g')
                    .attr('class', 'axis')
                    // I translate this element to its right position on the x axis
                    .attr('transform', function (d) {
                        return 'translate(' + x(d) + ')';
                    })
                    // And I build the axis with the call function
                    .each(function (d) {
                        d3.select(this).call(d3.axisLeft().ticks(5).scale(y[d]));
                    })
                    // Add axis title
                    .append('text')
                    //.style("text-anchor", "middle")
                    .attr('y', -5)
                    .text(function (d) {
                        return d;
                    })
                    .style('fill', '#707070');

                // Compute the binning for each group of the dataset
                const sumstat = domains.map(function (d, i) {
                    return {
                        key: d,
                        value: d3
                            .histogram()
                            .domain(y[d].domain())
                            .thresholds(y[d].ticks(20))
                            .value((d) => d)(slice_data.map((x) => d[i])),
                    };
                });

                // What is the biggest number of value in a bin? We need it cause this value will have a width of 100% of the bandwidth.
                let maxNum = 0;
                for (const i in sumstat) {
                    const allBins = sumstat[i].value;
                    const lengths = allBins.map(function (a) {
                        return a.length;
                    });
                    const longest = d3.max(lengths);
                    if (longest > maxNum) {
                        maxNum = longest;
                    }
                }

                // The maximum width of a violin must be x.bandwidth = the width dedicated to a group
                const xNum = d3.scaleLinear().range([0, x.bandwidth()]).domain([-maxNum, maxNum]);

                // Add the shape to this svg!
                svg.append('g')
                    .selectAll('myViolin')
                    .data(sumstat)
                    .enter() // So now we are working group per group
                    .append('g')
                    .attr('transform', function (d) {
                        return 'translate(' + x(d.key) + ' ,0)';
                    }) // Translation on the right to be at the group position
                    .append('path')
                    .datum(function (d) {
                        return d.value;
                    }) // So now we are working bin per bin
                    .style('stroke', 'none')
                    .style('fill', '#69b3a2')
                    .attr(
                        'd',
                        d3
                            .area()
                            .x0(function (d) {
                                return xNum(-d.length);
                            })
                            .x1(function (d) {
                                return xNum(d.length);
                            })
                            .y(function (d) {
                                return y[domains[0]](d.x0);
                            })
                            .curve(d3.curveCatmullRom) // This makes the line smoother to give the violin appearance. Try d3.curveStep to see the difference
                    );

                /*if (has_attr_data) {
                attrGroup
                    .append("rect")
                    .attr("x", function (d, i) { return x(domains[i]); })
                    .attr("y", function (d, i) { return y(0) + 0.5 * y.bandwidth(); })
                    .attr("width", x.bandwidth())
                    .attr("height", y.bandwidth() / 2)
                    .style("fill", function (d, i) { return getColor(d, spaceInfo.high[i + slice_idx], spaceInfo.low[i + slice_idx], isAttribution); });

                attrGroup
                    .append("text")
                    .attr("x", function (d, i) { return x(domains[i]) + 0.5 * x.bandwidth(); })
                    .attr("y", function (d, i) { return y(0) + 0.75 * y.bandwidth(); })
                    .text(function (d) { return "(" + d.toFixed(2) + ")"; })
                    .style("text-anchor", "middle");
                */
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
    }

    render() {
        return (
            <div ref={this.parallelRef}>
                <p style={{ color: 'grey', padding: '10px' }}>
                    Run the environment benchmark to collect & visualize data
                </p>
            </div>
        );
    }
}
