import React, { PureComponent } from 'react';
import * as d3 from 'd3';
import '../css/Run_Browser.module.css';

export default class run_browser_pixel_display extends PureComponent {
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
                this.props.groupedRowIndices,
                this.props.indexMap,
                this.props.experimentStrings
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
                this.props.groupedRowIndices,
                this.props.indexMap,
                this.props.experimentStrings
            );
        }
    }

    drawChart(data, getCallbackData, callbackFrequencies, highlightedRows, groupedRows, indexMap, exp_strings) {
        d3.select(this.linegraphRef.current.current).selectAll('*').remove();

        const margin = { top: 25, right: 20, bottom: 10, left: 20 };
        const svgWidth = this.linegraphRef.current.parentElement.clientWidth - margin.left - margin.right;
        // For each data row, we create one pixel display
        const svgHeight = 60 - margin.top - margin.bottom;

        const num_of_grouped_rows = groupedRows.length;
        if (num_of_grouped_rows > 0) {
            data = [
                ...data.filter((d, i) => groupedRows.includes(indexMap[i])),
                ...data.filter((d, i) => !groupedRows.includes(indexMap[i])),
            ];
            indexMap = [...groupedRows, ...indexMap.map((i) => !groupedRows.includes(i))];
            exp_strings = [
                ...exp_strings.filter((d, i) => !groupedRows.includes(indexMap[i])),
                ...exp_strings.filter((d, i) => groupedRows.includes(indexMap[i])),
            ];
        }

        const max_x_values = data.map((d) => (d.length > 0 ? d[d.length - 1][0] : 0));
        const y_bounds = {
            min: data.map((d) => d3.min(d.map((v) => v[1]))),
            max: data.map((d) => d3.max(d.map((v) => v[1]))),
        };
        const colors = d3.scaleSequential(d3.interpolateRdYlGn);
        const dataRowColorMap = d3.scaleOrdinal(d3.schemeTableau10);
        const num_of_colors = 10;

        d3.select(this.linegraphRef.current.current).select('*').remove();

        const x = d3.scaleLinear().range([0, svgWidth]);

        // let xAxis = svg.append("g")
        //     .attr("transform", "translate(0," + svgHeight + ")")
        //     .attr("class", "grayAxis")
        //     .call(d3.axisBottom(x).tickSize(-svgHeight))
        //     .call(g => g.selectAll(".tick line")
        //     .attr("stroke-opacity", 0.5)
        //     .attr("stroke-dasharray", "2,2"))
        //     .call(g => g.selectAll(".tick text")
        //         .attr("font-size", "11px"));

        const single_svgs = d3
            .select(this.linegraphRef.current.current)
            .selectAll('svg')
            .data(data)
            .enter()
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        single_svgs
            .filter((d, i) => i < num_of_grouped_rows)
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .attr('transform', 'translate(' + -margin.left + ',' + -margin.top + ')')
            .style('fill', '#cbcbcb');

        single_svgs
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('stroke', '#656565')
            .attr('stroke-width', 1.0)
            .style('fill', '#ffffff');

        let tmp_current_data;
        single_svgs
            //.each((data_row,i) => {tmp_current_data = data_row.map(d => d[0]); x.domain([0, max_x_values[i]]);return true;})
            .each(function (data_row, i) {
                if (i < num_of_grouped_rows) {
                    colors.domain([
                        d3.min(y_bounds.min.filter((d, i) => i < num_of_grouped_rows)),
                        d3.max(y_bounds.max.filter((d, i) => i < num_of_grouped_rows)),
                    ]);
                    x.domain([0, d3.max(max_x_values.filter((d, i) => i < num_of_grouped_rows))]);
                } else {
                    colors.domain([y_bounds.min[i], y_bounds.max[i]]);
                    x.domain([0, max_x_values[i]]);
                }
                tmp_current_data = data_row.map((d) => d[0]);

                d3.select(this)
                    .selectAll('rect')
                    .data(data_row)
                    .enter()
                    .append('rect')
                    .attr('x', (d) => x(d[0]))
                    .attr('y', 0)
                    .attr('width', (d) => x(d[2]))
                    .attr('height', svgHeight)
                    .style('fill', (d) => {
                        return colors(d[1]);
                    })
                    .on('mouseover', (d) => mouseover(d, i));
            });

        single_svgs
            .append('g')
            .attr('transform', 'translate(' + 0 + ',' + -5 + ')')
            .append('text')
            .text((d, i) => exp_strings[i]);

        const selectText = d3
            .select(this.linegraphRef.current.current)
            .append('text')
            .text('Experiment: ' + '-' + '  Ep.Length: ' + '-' + '  Ep.Reward: ' + '-');

        const callbackPoints = single_svgs
            .selectAll('circle')
            .data((data) => data)
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
            .attr('cy', 0)
            .attr('r', 7)
            .attr('stroke', function (d) {
                return dataRowColorMap(indexMap[d[2]] % num_of_colors);
            })
            .attr('stroke-width', '2')
            .attr('fill', 'white')
            .attr('pointer-events', 'all')
            .style('cursor', 'pointer')
            .on('click', circleClick);

        function mouseover(d, i) {
            selectText.html(
                'Experiment: <b>' +
                    exp_strings[i] +
                    '</b> | Ep.Length: <b>' +
                    d[2] +
                    '</b> | Ep.Reward: <b>' +
                    d[1] +
                    '</b>'
            );
        }

        function circleClick(d) {
            getCallbackData(d[2], d[0]);
        }
    }

    render() {
        return <div style={{ marginTop: '30px' }} ref={this.linegraphRef}></div>;
    }
}
